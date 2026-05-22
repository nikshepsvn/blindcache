import type { TaggerConfig } from "./tagger.js";

export type VaultConfig = {
  // If omitted, a fresh ephemeral signer is generated (useful for spikes/tests).
  privateKey?: string;
  dbs: string[];
  collectionId?: string;
  builderName?: string;
  // Auto-tagging: if tagger.apiKey is set, hearth augments every append with
  // 2-5 LLM-suggested topical tags via nilAI (TEE-based, OpenAI-compatible).
  tagger?: TaggerConfig;
};

const TESTNET_DBS = [
  "https://nildb-stg-n1.nillion.network",
  "https://nildb-stg-n2.nillion.network",
  "https://nildb-stg-n3.nillion.network",
];

export function configFromEnv(): VaultConfig {
  const privateKey = process.env.NIL_BUILDER_PRIVATE_KEY ?? undefined;
  const dbs = (process.env.NILDB_NODES ?? TESTNET_DBS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const taggerApiKey = process.env.NILLION_API_KEY ?? process.env.NILAI_API_KEY;
  const tagger: TaggerConfig | undefined = taggerApiKey
    ? {
        apiKey: taggerApiKey,
        baseUrl: process.env.NILAI_BASE_URL,
        model: process.env.NILAI_MODEL,
      }
    : undefined;

  return {
    privateKey,
    dbs,
    collectionId: process.env.HEARTH_COLLECTION_ID,
    builderName: process.env.HEARTH_BUILDER_NAME ?? "hearth",
    tagger,
  };
}
