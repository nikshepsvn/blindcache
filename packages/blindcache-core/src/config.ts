import type { NilaiConfig } from "./nilai.js";
import type { EmbedderConfig } from "./embeddings.js";

export type VaultConfig = {
  // If omitted, a fresh ephemeral signer is generated (useful for spikes/tests).
  privateKey?: string;
  dbs: string[];
  collectionId?: string;
  builderName?: string;
  // nilAI helper (auto-tagging + summarize). If apiKey is set, BlindCache
  // augments memory_append with 2-5 LLM-suggested topical tags and
  // unlocks memory_summary. TEE-based, OpenAI-compatible.
  tagger?: NilaiConfig;
  // Local embedding model (default: Xenova/all-MiniLM-L6-v2, q8 quantized).
  // Embeddings power semantic search; computed in-process so no plaintext
  // ever leaves the SDK for embedding.
  embedder?: EmbedderConfig;
};

export class ConfigError extends Error {
  constructor(msg: string) {
    super(`BlindCache config error: ${msg}`);
    this.name = "ConfigError";
  }
}

const TESTNET_DBS = [
  "https://nildb-stg-n1.nillion.network",
  "https://nildb-stg-n2.nillion.network",
  "https://nildb-stg-n3.nillion.network",
];

const HEX_64 = /^[0-9a-fA-F]{64}$/;

function validatePrivateKey(raw: string): string {
  const trimmed = raw.trim().replace(/^0x/, "");
  if (!HEX_64.test(trimmed)) {
    throw new ConfigError(
      `NIL_BUILDER_PRIVATE_KEY must be a 64-character hex string (a 32-byte secp256k1 key). ` +
        `Got ${trimmed.length} chars. Run \`pnpm keygen\` to generate one.`
    );
  }
  return trimmed.toLowerCase();
}

function validateDbs(raw: string): string[] {
  const urls = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (urls.length === 0) {
    throw new ConfigError(
      `NILDB_NODES is empty after parsing. Provide a comma-separated list of node URLs, ` +
        `or leave it unset to use testnet defaults.`
    );
  }
  for (const u of urls) {
    let parsed: URL;
    try {
      parsed = new URL(u);
    } catch {
      throw new ConfigError(
        `NILDB_NODES contains an unparseable URL: ${JSON.stringify(u)}. ` +
          `Each entry must start with https:// or http://.`
      );
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new ConfigError(
        `NILDB_NODES entry ${JSON.stringify(u)} uses unsupported protocol ${parsed.protocol}. ` +
          `Use https:// (or http:// for local dev).`
      );
    }
  }
  if (urls.length < 3) {
    // Soft warning — Shamir 3-of-3 sharing assumes 3 nodes. Don't throw,
    // just surface to stderr so the user sees it.
    console.error(
      `[blindcache] warning: NILDB_NODES has ${urls.length} node(s); SDK defaults assume 3.`
    );
  }
  return urls;
}

function validateBaseUrl(raw: string | undefined, name: string): string | undefined {
  if (!raw) return undefined;
  try {
    new URL(raw);
  } catch {
    throw new ConfigError(
      `${name} is not a valid URL: ${JSON.stringify(raw)}.`
    );
  }
  return raw;
}

export function configFromEnv(): VaultConfig {
  const rawKey = process.env.NIL_BUILDER_PRIVATE_KEY;
  const privateKey = rawKey ? validatePrivateKey(rawKey) : undefined;

  const dbs = validateDbs(process.env.NILDB_NODES ?? TESTNET_DBS.join(","));

  const taggerApiKey = process.env.NILLION_API_KEY ?? process.env.NILAI_API_KEY;
  const tagger: NilaiConfig | undefined = taggerApiKey
    ? {
        apiKey: taggerApiKey,
        baseUrl: validateBaseUrl(process.env.NILAI_BASE_URL, "NILAI_BASE_URL"),
        model: process.env.NILAI_MODEL,
      }
    : undefined;

  return {
    privateKey,
    dbs,
    collectionId: process.env.BLINDCACHE_COLLECTION_ID,
    builderName: process.env.BLINDCACHE_BUILDER_NAME ?? "blindcache",
    tagger,
    embedder: {
      model: process.env.BLINDCACHE_EMBED_MODEL,
      dtype: (process.env.BLINDCACHE_EMBED_DTYPE as "fp32" | "fp16" | "q8" | "q4" | undefined),
    },
  };
}
