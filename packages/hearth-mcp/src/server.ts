#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Vault, configFromEnv } from "hearth-core";

const STATE_FILE = ".hearth-collection-id";

function asText(payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

async function main() {
  const cfg = configFromEnv();
  if (!cfg.collectionId && existsSync(STATE_FILE)) {
    cfg.collectionId = readFileSync(STATE_FILE, "utf8").trim();
  }

  const vault = await Vault.open(cfg);
  writeFileSync(STATE_FILE, vault.getCollectionId());

  const server = new McpServer({
    name: "hearth",
    version: "0.0.1",
  });

  server.registerTool(
    "memory_append",
    {
      title: "Append a memory",
      description:
        "Store an encrypted memory in the user's Hearth vault. Content is encrypted and split across nilDB nodes; no operator can read it.",
      inputSchema: {
        content: z.string().describe("The text to remember"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Optional tags for filtering later"),
        source: z
          .string()
          .optional()
          .describe(
            "Tool/agent that wrote this memory (e.g. 'claude-code', 'cursor')"
          ),
      },
    },
    async ({ content, tags, source }) => {
      const entry = await vault.append({ content, tags, source });
      return asText({ ok: true, id: entry.id, timestamp: entry.timestamp });
    }
  );

  server.registerTool(
    "memory_search",
    {
      title: "Search memories",
      description:
        "Search the user's encrypted memory vault. Filter by tags/source server-side; the optional 'query' string is applied client-side after decryption.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Substring to match against decrypted content"),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        limit: z.number().int().positive().max(200).optional(),
      },
    },
    async ({ query, tags, source, limit }) => {
      const results = await vault.search({ query, tags, source, limit });
      return asText({ count: results.length, results });
    }
  );

  server.registerTool(
    "memory_list",
    {
      title: "List recent memories",
      description: "Return the most recent memories in the vault.",
      inputSchema: {
        limit: z.number().int().positive().max(200).optional(),
      },
    },
    async ({ limit }) => {
      const results = await vault.list(limit ?? 50);
      return asText({ count: results.length, results });
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

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", () => {
    void server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("hearth-mcp failed to start:", err);
  process.exit(1);
});
