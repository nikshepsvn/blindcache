// Generates a fresh secp256k1 builder key for BlindCache.
// Run: pnpm keygen
//
// We can't use Signer.generate() and ask for the private key back —
// the SDK hides it for safety. So we generate 32 random bytes ourselves
// and hand them to Signer.fromPrivateKey().
import { randomBytes } from "node:crypto";
import { Signer } from "@nillion/nuc";

async function main() {
  const bytes = randomBytes(32);
  const hex = bytes.toString("hex");
  const signer = Signer.fromPrivateKey(hex, "key");
  const did = await signer.getDid();
  const didString = (did as { didString?: string }).didString ?? String(did);

  console.log("");
  console.log("  BlindCache builder key generated");
  console.log("  ─────────────────────────────");
  console.log("  PRIVATE KEY:", hex);
  console.log("  DID:        ", didString);
  console.log("");
  console.log("  Save the private key — it's the only way back into this vault.");
  console.log("  Add to .env or your MCP server config:");
  console.log("");
  console.log("    NIL_BUILDER_PRIVATE_KEY=" + hex);
  console.log("");
}

main().catch((err) => {
  console.error("keygen failed:", err);
  process.exit(1);
});
