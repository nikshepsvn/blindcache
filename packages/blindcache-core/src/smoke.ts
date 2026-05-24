import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { Vault } from "./vault.js";
import { configFromEnv } from "./config.js";

const STATE_FILE = ".blindcache-collection-id";

async function timed<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  console.log(`  ${label.padEnd(40)} ${ms.toFixed(0).padStart(6)}ms`);
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

  console.log("\n=== BlindCache Smoke Test ===\n");
  console.log("dbs:", cfg.dbs.join(", "));
  console.log("collectionId (input):", cfg.collectionId ?? "(none — will create)");
  console.log("");

  const { result: vault, ms: openMs } = await timed("vault.open()", () =>
    Vault.open(cfg)
  );
  const collectionId = vault.getCollectionId();
  console.log("  collectionId (active):              ", collectionId);
  console.log(
    "  nilAI (auto-tag + summarize):       ",
    vault.hasNilai() ? "ON" : "off (no NILLION_API_KEY)"
  );
  writeFileSync(STATE_FILE, collectionId);

  // Pre-warm the embedder so the first append doesn't pay model-load latency.
  const { ms: warmMs } = await timed("embedder.warm() (one-time)", () =>
    vault.warmEmbedder()
  );

  // Deliberately distinguishable topics so semantic ranking is testable.
  const seeds = [
    "Pair-programmed with Maya on Stripe webhook retry logic — exponential backoff capped at 6 attempts.",
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

  console.log("\n--- append x10 (auto-tag + embedding + scope='smoke') ---");
  const appendTimes: number[] = [];
  const appended: Awaited<ReturnType<typeof vault.append>>[] = [];
  for (let i = 0; i < seeds.length; i++) {
    const { ms, result } = await timed(`append #${i + 1}`, () =>
      vault.append({ content: seeds[i]!, source: "smoke", scope: "smoke" })
    );
    appendTimes.push(ms);
    appended.push(result);
  }

  console.log("\n--- semantic search (the new thing) ---");
  const queries = [
    { q: "payment processing bugs", expectedHint: "stripe" },
    { q: "vacation booking dental", expectedHint: "dentist" },
    { q: "AI research papers", expectedHint: "lecun" },
    { q: "what should I cook tonight", expectedHint: "grocery" },
  ];

  const semanticTimes: number[] = [];
  for (const { q, expectedHint } of queries) {
    const { ms, result } = await timed(`semantic("${q}")`, () =>
      vault.search({ semantic: q, scope: "smoke", limit: 3 })
    );
    semanticTimes.push(ms);
    const top = result.entries[0];
    const matched = top?.content.toLowerCase().includes(expectedHint);
    console.log(
      `      top: ${matched ? "✓" : "?"} "${top?.content.slice(0, 60)}…" (score ${top?.score?.toFixed(3) ?? "-"})`
    );
  }

  console.log("\n--- classic structured search ---");
  const { ms: scopeMs, result: scoped } = await timed(
    "search({scope:'smoke'})",
    () => vault.search({ scope: "smoke", limit: 20 })
  );
  console.log(`  → ${scoped.entries.length} entries`);

  const { ms: timeMs } = await timed("search({since:'5m'})", () =>
    vault.search({ since: "5m", scope: "smoke" })
  );

  console.log("\n--- update ---");
  const target = appended[0]!;
  const { ms: updateMs, result: updated } = await timed(
    `update(${target.id.slice(0, 8)}…)`,
    () => vault.update({ id: target.id, tags: [...target.tags, "edited"] })
  );
  console.log(`  modified ${updated} document(s)`);

  console.log("\n--- bulkAppend x5 (no auto-tag, embeddings still on) ---");
  const { ms: bulkMs, result: bulk } = await timed("bulkAppend(5)", () =>
    vault.bulkAppend(
      [1, 2, 3, 4, 5].map((n) => ({
        content: `bulk entry #${n} — ${new Date().toISOString()}`,
        tags: ["bulk", `n${n}`],
        source: "smoke",
        scope: "smoke",
      })),
      { autoTag: false }
    )
  );
  console.log(`  wrote ${bulk.length} entries in one call`);

  console.log("\n--- delete ---");
  let deleteMs = 0;
  if (scoped.entries.length > 0) {
    const t = await timed(`delete(${scoped.entries[0]!.id.slice(0, 8)}…)`, () =>
      vault.delete(scoped.entries[0]!.id)
    );
    deleteMs = t.ms;
  }

  console.log("\n=== Latency Summary ===");
  console.log(`  open:                       ${openMs.toFixed(0)}ms`);
  console.log(`  embedder warm (one-time):   ${warmMs.toFixed(0)}ms`);
  console.log(
    `  append (auto-tag + embed):  median ${percentile(appendTimes, 50).toFixed(0)}ms   p95 ${percentile(appendTimes, 95).toFixed(0)}ms`
  );
  console.log(
    `  semantic search:            median ${percentile(semanticTimes, 50).toFixed(0)}ms   p95 ${percentile(semanticTimes, 95).toFixed(0)}ms`
  );
  console.log(`  bulkAppend(5):              ${bulkMs.toFixed(0)}ms`);
  console.log(`  update:                     ${updateMs.toFixed(0)}ms`);
  console.log(`  search (scope only):        ${scopeMs.toFixed(0)}ms`);
  console.log(`  search (time-range):        ${timeMs.toFixed(0)}ms`);
  console.log(`  delete:                     ${deleteMs.toFixed(0)}ms`);
}

main().catch((err) => {
  console.error("\nSmoke test failed:");
  if (err instanceof Error) {
    console.error(err.message);
    if (err.stack) console.error(err.stack);
  } else {
    console.error(JSON.stringify(err, null, 2));
  }
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
