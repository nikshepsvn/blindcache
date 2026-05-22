import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { Vault } from "./vault.js";
import { configFromEnv } from "./config.js";

const STATE_FILE = ".hearth-collection-id";

async function timed<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  console.log(`  ${label.padEnd(28)} ${ms.toFixed(0).padStart(6)}ms`);
  return { result, ms };
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx] ?? 0;
}

async function main() {
  const cfg = configFromEnv();
  if (!cfg.collectionId && existsSync(STATE_FILE)) {
    cfg.collectionId = readFileSync(STATE_FILE, "utf8").trim();
  }

  console.log("\n=== Hearth Smoke Test ===\n");
  console.log("dbs:", cfg.dbs.join(", "));
  console.log("collectionId (input):", cfg.collectionId ?? "(none — will create)");
  console.log("");

  const { result: vault, ms: openMs } = await timed("vault.open()", () => Vault.open(cfg));
  const collectionId = vault.getCollectionId();
  console.log("  collectionId (active):       ", collectionId);
  writeFileSync(STATE_FILE, collectionId);

  console.log("\n--- append x10 ---");
  const appendTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const { ms } = await timed(`append #${i + 1}`, () =>
      vault.append({
        content: `entry-${i} at ${new Date().toISOString()} — quick brown fox ${i}`,
        tags: i % 2 === 0 ? ["test", "even"] : ["test", "odd"],
        source: "smoke",
      })
    );
    appendTimes.push(ms);
  }

  console.log("\n--- search ---");
  const { ms: searchMs, result: hits } = await timed("search({source:'smoke'})", () =>
    vault.search({ source: "smoke", limit: 20 })
  );
  console.log(`  → ${hits.length} entries`);

  const { ms: tagMs } = await timed("search({tags:['even']})", () =>
    vault.search({ tags: ["even"] })
  );
  const { ms: queryMs, result: foxHits } = await timed(
    "search({query:'fox 7'})",
    () => vault.search({ query: "fox 7", source: "smoke" })
  );
  console.log(`  → ${foxHits.length} match(es) for 'fox 7'`);
  if (foxHits.length > 0) {
    console.log(`  decrypted sample: "${foxHits[0]!.content.slice(0, 60)}..."`);
  }

  console.log("\n--- delete ---");
  let deleteMs = 0;
  if (hits.length > 0) {
    const t = await timed(`delete(${hits[0]!.id})`, () => vault.delete(hits[0]!.id));
    deleteMs = t.ms;
  }

  console.log("\n=== Latency Summary ===");
  console.log(`  open:                 ${openMs.toFixed(0)}ms`);
  console.log(
    `  append:  median ${percentile(appendTimes, 50).toFixed(0)}ms   p95 ${percentile(appendTimes, 95).toFixed(0)}ms`
  );
  console.log(`  search:               ${searchMs.toFixed(0)}ms`);
  console.log(`  tag-filter search:    ${tagMs.toFixed(0)}ms`);
  console.log(`  query+filter:         ${queryMs.toFixed(0)}ms`);
  console.log(`  delete:               ${deleteMs.toFixed(0)}ms`);
}

main().catch((err) => {
  console.error("\nSmoke test failed:");
  console.error(JSON.stringify(err, null, 2));
  if (Array.isArray(err)) {
    for (const e of err) {
      console.error("---");
      console.error("node:", e?.node);
      console.error("message:", e?.error?.message);
      console.error("status:", e?.error?.status);
      console.error("body:", JSON.stringify(e?.error?.body, null, 2));
    }
  }
  process.exit(1);
});
