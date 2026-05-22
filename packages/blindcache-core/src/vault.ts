import { Signer } from "@nillion/nuc";
import { SecretVaultBuilderClient } from "@nillion/secretvaults";
import { v4 as uuidv4 } from "uuid";
import type { VaultConfig } from "./config.js";
import { MEMORY_SCHEMA, SCHEMA_VERSION } from "./schema.js";
import { Nilai } from "./nilai.js";
import { parseTime } from "./time.js";
import { type Cursor, decodeCursor, encodeCursor } from "./cursor.js";

const DEFAULT_SCOPE = "default";
const MAX_PAGE = 200;

export type MemoryEntry = {
  id: string;
  timestamp: string;
  tags: string[];
  source: string;
  scope: string;
  content: string;
};

export type AppendInput = {
  content: string;
  tags?: string[];
  source?: string;
  scope?: string;
};

export type SearchInput = {
  query?: string;
  tags?: string[];
  source?: string;
  scope?: string;
  since?: string | number | Date;
  before?: string | number | Date;
  limit?: number;
  cursor?: string;
};

export type SearchResult = {
  entries: MemoryEntry[];
  nextCursor?: string;
};

export type UpdateInput = {
  id: string;
  content?: string;
  tags?: string[];
  source?: string;
  scope?: string;
};

export type SummarizeInput = SearchInput & {
  instruction?: string;
  maxEntries?: number;
};

export class Vault {
  private constructor(
    private readonly client: SecretVaultBuilderClient,
    private collectionId: string,
    private readonly builderName: string,
    private readonly nilai: Nilai | null
  ) {}

  hasNilai(): boolean {
    return this.nilai !== null;
  }
  // Back-compat (used by smoke + MCP).
  hasTagger(): boolean {
    return this.hasNilai();
  }

  static async open(config: VaultConfig): Promise<Vault> {
    const signer = config.privateKey
      ? Signer.fromPrivateKey(config.privateKey, "key")
      : Signer.generate("key");
    return Vault.openWithSigner(signer, config);
  }

  static async openWithSigner(
    signer: Signer,
    config: Omit<VaultConfig, "privateKey"> & { privateKey?: string }
  ): Promise<Vault> {
    const client = await SecretVaultBuilderClient.from({
      signer,
      dbs: config.dbs,
      blindfold: { operation: "store" },
    });

    const builderName = config.builderName ?? "blindcache";
    await ensureBuilderRegistered(client, builderName);

    const collectionId = await ensureCollection(
      client,
      config.collectionId,
      builderName
    );

    const nilai = config.tagger ? Nilai.maybeCreate(config.tagger) : null;
    return new Vault(client, collectionId, builderName, nilai);
  }

  getCollectionId(): string {
    return this.collectionId;
  }

  // ── writes ───────────────────────────────────────────────────────────────

  async append(input: AppendInput): Promise<MemoryEntry> {
    const entry = await this.buildEntry(input, /* autoTag */ true);
    await this.client.createStandardData({
      collection: this.collectionId,
      data: [toStoredRow(entry)],
    });
    return entry;
  }

  async bulkAppend(
    inputs: AppendInput[],
    options: { autoTag?: boolean } = {}
  ): Promise<MemoryEntry[]> {
    if (inputs.length === 0) return [];
    const autoTag = options.autoTag ?? false;
    const entries: MemoryEntry[] = [];
    for (const input of inputs) {
      entries.push(await this.buildEntry(input, autoTag));
    }
    await this.client.createStandardData({
      collection: this.collectionId,
      data: entries.map(toStoredRow),
    });
    return entries;
  }

  async update(input: UpdateInput): Promise<number> {
    // The SDK's blindfold layer expects every write to fan out into N shares
    // (one per node). It only knows how to do that when the body contains a
    // %allot field. So we always re-include `content` — either the new
    // value the caller passed, or the existing value re-fetched and
    // re-encrypted. This is the only way to make plaintext-only updates
    // (re-tag, change scope, etc.) work with blindfold on.
    let newContent = input.content;
    if (newContent === undefined) {
      const existing = await this.client.findData({
        collection: this.collectionId,
        filter: { _id: input.id },
        pagination: { limit: 1, offset: 0 },
      });
      if (existing.data.length === 0) return 0;
      newContent = rowToEntry(existing.data[0]!).content;
    }

    const set: Record<string, unknown> = {
      content: { "%allot": newContent },
    };
    if (input.tags !== undefined) set.tags = input.tags.map((t) => t.toLowerCase());
    if (input.source !== undefined) set.source = input.source;
    if (input.scope !== undefined) set.scope = input.scope;

    const response = await this.client.updateData({
      collection: this.collectionId,
      filter: { _id: input.id },
      update: { $set: set },
    });
    let max = 0;
    for (const perNode of Object.values(response)) {
      const m = perNode?.data?.modified ?? 0;
      if (m > max) max = m;
    }
    return max;
  }

  async delete(id: string): Promise<number> {
    const response = await this.client.deleteData({
      collection: this.collectionId,
      filter: { _id: id },
    });
    let max = 0;
    for (const perNode of Object.values(response)) {
      const count = perNode?.data?.deletedCount ?? 0;
      if (count > max) max = count;
    }
    return max;
  }

  // ── reads ────────────────────────────────────────────────────────────────

  async search(input: SearchInput = {}): Promise<SearchResult> {
    const filter = this.buildFilter(input);
    const limit = clamp(input.limit ?? 50, 1, MAX_PAGE);

    const response = await this.client.findData({
      collection: this.collectionId,
      filter,
      pagination: {
        limit: limit + 1, // overscan by 1 to compute nextCursor
        offset: 0,
        sort: { timestamp: -1, _id: -1 },
      },
    });

    let rows = response.data.map(rowToEntry);

    if (input.query) {
      const q = input.query.toLowerCase();
      rows = rows.filter((e) => e.content.toLowerCase().includes(q));
    }

    let nextCursor: string | undefined;
    if (rows.length > limit) {
      const tail = rows[limit - 1]!;
      nextCursor = encodeCursor({ timestamp: tail.timestamp, id: tail.id });
      rows = rows.slice(0, limit);
    }

    return { entries: rows, nextCursor };
  }

  async list(limit = 50): Promise<MemoryEntry[]> {
    const r = await this.search({ limit });
    return r.entries;
  }

  // ── nilAI-powered ────────────────────────────────────────────────────────

  async summarize(input: SummarizeInput = {}): Promise<string> {
    if (!this.nilai) {
      throw new Error(
        "memory_summary requires NILLION_API_KEY (nilAI). Set it in the env."
      );
    }
    const maxEntries = clamp(input.maxEntries ?? 50, 1, MAX_PAGE);
    const { entries } = await this.search({
      ...input,
      limit: maxEntries,
    });
    return this.nilai.summarize(
      entries.map((e) => ({
        timestamp: e.timestamp,
        tags: e.tags,
        content: e.content,
      })),
      input.instruction
    );
  }

  // ── internals ────────────────────────────────────────────────────────────

  private async buildEntry(
    input: AppendInput,
    autoTag: boolean
  ): Promise<MemoryEntry> {
    const provided = input.tags ?? [];
    const suggested =
      autoTag && this.nilai ? await this.nilai.suggestTags(input.content) : [];
    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      tags: mergeTags(provided, suggested),
      source: input.source ?? "unknown",
      scope: input.scope ?? DEFAULT_SCOPE,
      content: input.content,
    };
  }

  private buildFilter(input: SearchInput): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (input.tags && input.tags.length > 0) {
      filter.tags = { $in: input.tags.map((t) => t.toLowerCase()) };
    }
    if (input.source) filter.source = input.source;
    if (input.scope) filter.scope = input.scope;

    const timeFilter: Record<string, string> = {};
    if (input.since !== undefined) timeFilter.$gte = parseTime(input.since);
    if (input.before !== undefined) timeFilter.$lt = parseTime(input.before);

    const cursor: Cursor | null = input.cursor ? decodeCursor(input.cursor) : null;
    if (cursor) {
      // Compound key: timestamp DESC then _id DESC.
      // Next page = entries strictly older than (cursorTs, cursorId).
      if (!timeFilter.$lt || timeFilter.$lt > cursor.timestamp) {
        timeFilter.$lt = cursor.timestamp;
      }
    }
    if (Object.keys(timeFilter).length > 0) filter.timestamp = timeFilter;
    return filter;
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

async function ensureBuilderRegistered(
  client: SecretVaultBuilderClient,
  name: string
): Promise<void> {
  try {
    await client.readProfile();
    return;
  } catch {
    // Profile doesn't exist yet — fall through to register.
  }

  const didObj = await client.getDid();
  const did =
    (didObj as { didString?: string }).didString ??
    (typeof (didObj as { toJSON?: () => string }).toJSON === "function"
      ? (didObj as { toJSON: () => string }).toJSON()
      : String(didObj));
  try {
    await client.register({ did, name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already|exists|duplicate/i.test(msg)) throw err;
  }
}

async function ensureCollection(
  client: SecretVaultBuilderClient,
  existing: string | undefined,
  name: string
): Promise<string> {
  if (existing) {
    try {
      await client.readCollection(existing);
      return existing;
    } catch {
      // Fall through — collection ID stale or wrong env.
    }
  }
  const collectionId = uuidv4();
  await client.createCollection({
    _id: collectionId,
    type: "standard",
    name: `${name}-memories-${SCHEMA_VERSION}`,
    schema: MEMORY_SCHEMA as unknown as Record<string, unknown>,
  });
  return collectionId;
}

function toStoredRow(e: MemoryEntry): Record<string, unknown> {
  return {
    _id: e.id,
    timestamp: e.timestamp,
    tags: e.tags,
    source: e.source,
    scope: e.scope,
    content: { "%allot": e.content },
  };
}

function rowToEntry(row: Record<string, unknown>): MemoryEntry {
  const content = row.content;
  let text = "";
  if (typeof content === "string") {
    text = content;
  } else if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (typeof c["%share"] === "string") text = c["%share"] as string;
    else if (typeof c.value === "string") text = c.value as string;
  }
  return {
    id: String(row._id ?? ""),
    timestamp: String(row.timestamp ?? ""),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    source: String(row.source ?? "unknown"),
    scope: String(row.scope ?? DEFAULT_SCOPE),
    content: text,
  };
}

function mergeTags(provided: string[], suggested: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...provided, ...suggested]) {
    const norm = t.toLowerCase().trim();
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
    if (out.length >= 8) break;
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
