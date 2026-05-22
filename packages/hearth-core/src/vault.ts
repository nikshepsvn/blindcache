import { Signer } from "@nillion/nuc";
import { SecretVaultBuilderClient } from "@nillion/secretvaults";
import { v4 as uuidv4 } from "uuid";
import type { VaultConfig } from "./config.js";
import { MEMORY_SCHEMA } from "./schema.js";

export type MemoryEntry = {
  id: string;
  timestamp: string;
  tags: string[];
  source: string;
  content: string;
};

export type AppendInput = {
  content: string;
  tags?: string[];
  source?: string;
};

export type SearchInput = {
  query?: string;
  tags?: string[];
  source?: string;
  limit?: number;
};

export class Vault {
  private constructor(
    private readonly client: SecretVaultBuilderClient,
    private collectionId: string,
    private readonly builderName: string
  ) {}

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

    const builderName = config.builderName ?? "hearth";
    await ensureBuilderRegistered(client, builderName);

    const collectionId = await ensureCollection(
      client,
      config.collectionId,
      builderName
    );

    return new Vault(client, collectionId, builderName);
  }

  getCollectionId(): string {
    return this.collectionId;
  }

  async append(input: AppendInput): Promise<MemoryEntry> {
    const id = uuidv4();
    const entry = {
      _id: id,
      timestamp: new Date().toISOString(),
      tags: input.tags ?? [],
      source: input.source ?? "unknown",
      content: { "%allot": input.content },
    };

    await this.client.createStandardData({
      collection: this.collectionId,
      data: [entry],
    });

    return {
      id,
      timestamp: entry.timestamp,
      tags: entry.tags,
      source: entry.source,
      content: input.content,
    };
  }

  async search(input: SearchInput = {}): Promise<MemoryEntry[]> {
    const filter: Record<string, unknown> = {};
    if (input.tags && input.tags.length > 0) {
      filter.tags = { $in: input.tags };
    }
    if (input.source) {
      filter.source = input.source;
    }

    const response = await this.client.findData({
      collection: this.collectionId,
      filter,
      pagination: {
        limit: input.limit ?? 50,
        offset: 0,
        sort: { timestamp: -1 },
      },
    });

    const decrypted: MemoryEntry[] = response.data.map(rowToEntry);

    if (!input.query) return decrypted;

    const q = input.query.toLowerCase();
    return decrypted.filter((e) => e.content.toLowerCase().includes(q));
  }

  async list(limit = 50): Promise<MemoryEntry[]> {
    return this.search({ limit });
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
}

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
    name: `${name}-memories`,
    schema: MEMORY_SCHEMA as unknown as Record<string, unknown>,
  });
  return collectionId;
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
    content: text,
  };
}
