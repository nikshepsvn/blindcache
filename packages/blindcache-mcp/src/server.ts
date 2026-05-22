#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { Vault, configFromEnv } from "blindcache-core";

const STATE_FILE = ".blindcache-collection-id";

function asText(payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

const time = z.union([z.string(), z.number()]).optional();

function buildServer(vault: Vault): McpServer {
  const server = new McpServer({ name: "blindcache", version: "0.1.0" });

  server.registerTool(
    "memory_append",
    {
      title: "Append a memory",
      description:
        "Store an encrypted memory in the user's BlindCache vault. Content is encrypted and split across nilDB nodes; no operator can read it. If NILLION_API_KEY is set, content is auto-tagged via nilAI.",
      inputSchema: {
        content: z.string().describe("The text to remember"),
        tags: z.array(z.string()).optional(),
        source: z
          .string()
          .optional()
          .describe("Tool/agent that wrote this (e.g. 'claude-code', 'cursor')"),
        scope: z
          .string()
          .optional()
          .describe("Namespace (e.g. 'personal', 'work', 'code'). Defaults to 'default'."),
      },
    },
    async ({ content, tags, source, scope }) => {
      const entry = await vault.append({ content, tags, source, scope });
      return asText({
        ok: true,
        id: entry.id,
        timestamp: entry.timestamp,
        tags: entry.tags,
        scope: entry.scope,
      });
    }
  );

  server.registerTool(
    "memory_bulk_append",
    {
      title: "Append many memories at once",
      description:
        "Bulk-write encrypted memories in a single round trip. Skips auto-tagging by default for performance — caller should supply tags.",
      inputSchema: {
        entries: z
          .array(
            z.object({
              content: z.string(),
              tags: z.array(z.string()).optional(),
              source: z.string().optional(),
              scope: z.string().optional(),
            })
          )
          .min(1)
          .max(200),
        autoTag: z
          .boolean()
          .optional()
          .describe("Auto-tag via nilAI (default false for bulk)"),
      },
    },
    async ({ entries, autoTag }) => {
      const written = await vault.bulkAppend(entries, { autoTag: autoTag ?? false });
      return asText({ ok: true, written: written.length, ids: written.map((e) => e.id) });
    }
  );

  server.registerTool(
    "memory_search",
    {
      title: "Search memories",
      description:
        "Server filters on tags/source/scope/timestamp (plaintext). The optional 'query' is applied client-side after decryption. Supports cursor pagination.",
      inputSchema: {
        query: z.string().optional(),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        scope: z.string().optional(),
        since: time.describe("ISO date, ms epoch, or relative ('7d', '24h', '15m')"),
        before: time,
        limit: z.number().int().positive().max(200).optional(),
        cursor: z.string().optional(),
      },
    },
    async (args) => {
      const r = await vault.search(args);
      return asText({
        count: r.entries.length,
        entries: r.entries,
        nextCursor: r.nextCursor ?? null,
      });
    }
  );

  server.registerTool(
    "memory_list",
    {
      title: "List recent memories",
      description: "Most-recent-first listing of memories in the vault.",
      inputSchema: {
        scope: z.string().optional(),
        limit: z.number().int().positive().max(200).optional(),
      },
    },
    async ({ scope, limit }) => {
      const r = await vault.search({ scope, limit: limit ?? 50 });
      return asText({ count: r.entries.length, entries: r.entries });
    }
  );

  server.registerTool(
    "memory_update",
    {
      title: "Update a memory",
      description:
        "Edit an existing memory by id. Pass only the fields you want to change. The SDK re-encrypts the content as part of every update.",
      inputSchema: {
        id: z.string().uuid(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        scope: z.string().optional(),
      },
    },
    async (args) => {
      const modified = await vault.update(args);
      return asText({ ok: modified > 0, modified });
    }
  );

  server.registerTool(
    "memory_delete",
    {
      title: "Delete a memory",
      description: "Permanently remove a memory by id.",
      inputSchema: {
        id: z.string().uuid(),
      },
    },
    async ({ id }) => {
      const deleted = await vault.delete(id);
      return asText({ ok: deleted > 0, deleted });
    }
  );

  server.registerTool(
    "memory_summary",
    {
      title: "Summarize memories (nilAI)",
      description:
        "Pull memories matching a filter and summarize them via nilAI (private LLM in TEE). Requires NILLION_API_KEY. Use 'instruction' to steer the summary.",
      inputSchema: {
        instruction: z.string().optional(),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        scope: z.string().optional(),
        since: time,
        before: time,
        maxEntries: z.number().int().positive().max(200).optional(),
      },
    },
    async (args) => {
      const summary = await vault.summarize(args);
      return asText({ summary });
    }
  );

  return server;
}

async function runStdio(vault: Vault): Promise<void> {
  const server = buildServer(vault);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.on("SIGINT", () => {
    void server.close();
    process.exit(0);
  });
}

async function runHttp(vault: Vault, port: number, token: string): Promise<void> {
  const server = buildServer(vault);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — one server, one user
  });
  await server.connect(transport);

  const http = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, collection: vault.getCollectionId() }));
      return;
    }
    if (req.url !== "/mcp") {
      res.writeHead(404).end();
      return;
    }
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${token}`) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("[blindcache-mcp] http handler error:", err);
      if (!res.headersSent) res.writeHead(500).end();
    }
  });

  await new Promise<void>((resolve) => http.listen(port, "127.0.0.1", resolve));
  console.error(
    `[blindcache-mcp] http listening on 127.0.0.1:${port} (collection ${vault.getCollectionId()})`
  );

  process.on("SIGINT", () => {
    void server.close();
    http.close(() => process.exit(0));
  });
}

async function main() {
  const cfg = configFromEnv();
  if (!cfg.collectionId && existsSync(STATE_FILE)) {
    cfg.collectionId = readFileSync(STATE_FILE, "utf8").trim();
  }

  const vault = await Vault.open(cfg);
  writeFileSync(STATE_FILE, vault.getCollectionId());

  const httpPortEnv = process.env.BLINDCACHE_HTTP_PORT;
  if (httpPortEnv) {
    const port = Number.parseInt(httpPortEnv, 10);
    const token = process.env.BLINDCACHE_HTTP_TOKEN;
    if (!token) {
      throw new Error(
        "BLINDCACHE_HTTP_PORT is set, but BLINDCACHE_HTTP_TOKEN is missing — refusing to start an unauthenticated HTTP server."
      );
    }
    await runHttp(vault, port, token);
  } else {
    await runStdio(vault);
  }
}

main().catch((err) => {
  console.error("blindcache-mcp failed to start:", err);
  process.exit(1);
});
