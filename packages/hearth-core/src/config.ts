export type VaultConfig = {
  // If omitted, a fresh ephemeral signer is generated (useful for spikes/tests).
  privateKey?: string;
  dbs: string[];
  collectionId?: string;
  builderName?: string;
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
  return {
    privateKey,
    dbs,
    collectionId: process.env.HEARTH_COLLECTION_ID,
    builderName: process.env.HEARTH_BUILDER_NAME ?? "hearth",
  };
}
