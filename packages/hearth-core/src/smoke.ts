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
  console.log("  auto-tagger:                 ", vault.hasTagger() ? "ON (nilAI)" : "off (no NILLION_API_KEY)");
  writeFileSync(STATE_FILE, collectionId);

  const seeds = [
    "Pair-programmed with Maya on the Stripe webhook retry logic — exponential backoff capped at 6 attempts.",
    "Reminder: book dentist appointment for early June, prefer mornings.",
    "Read a Rust blog post on async cancellation safety — Tokio's CancellationToken pattern.",
    "Q3 hiring plan needs 2 backend engineers and 1 designer.",
    "Spike on Nillion vault — sub-500ms encrypted writes against testnet.",
    "Idea: an MCP server that gives every agent the same personal memory.",
    "Grocery list: olive oil, sourdough, basil.",
    "Listened to a Lex Fridman ep with Yann LeCun on JEPA architectures.",
    "Followup with Devon next week re: the partner agreement draft.",
    "Espresso machine descaling — every 60 cups apparently.",
  ];

  console.log("\n--- append x10 ---");
  const appendTimes: number[] = [];
  const appended: Awaited<ReturnType<typeof vault.append>>[] = [];
  for (let i = 0; i < seeds.length; i++) {
    const { ms, result } = await timed(`append #${i + 1}`, () =>
      vault.append({ content: seeds[i]!, source: "smoke" })
    );
    appendTimes.push(ms);
    appended.push(result);
  }

  if (vault.hasTagger()) {
    console.log("\n--- sample auto-tags ---");
    for (let i = 0; i < Math.min(5, appended.length); i++) {
      const entry = appended[i]!;
      console.log(
        `  "${entry.content.slice(0, 40)}…" → [${entry.tags.join(", ")}]`
      );
    }
  }

  console.log("\n--- search ---");
  const { ms: searchMs, result: hits } = await timed("search({source:'smoke'})", () =>
    vault.search({ source: "smoke", limit: 20 })
  );
  console.log(`  → ${hits.length} entries`);

  const probeTags = vault.hasTagger()
    ? appended.flatMap((e) => e.tags).filter((t) => t !== "smoke")
    : [];
  const probeTag = probeTags[0];
  const { ms: tagMs } = probeTag
    ? await timed(`search({tags:['${probeTag}']})`, () =>
        vault.search({ tags: [probeTag] })
      )
    : { ms: 0 };

  const { ms: queryMs, result: foxHits } = await timed(
    "search({query:'stripe'})",
    () => vault.search({ query: "stripe", source: "smoke" })
  );
  console.log(`  → ${foxHits.length} match(es) for 'stripe'`);
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
