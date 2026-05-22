<p align="center">
  <img src="docs/banner.jpg" alt="BLINDCACHE" />
</p>

<h1 align="center">BlindCache</h1>

<p align="center">
  <b>An encrypted memory layer for AI agents, built on Nillion's Blind Computer.</b><br/>
  Sharded across three nilDB nodes. No operator — not even us — can read your content at rest.
</p>

<p align="center">
  <a href="https://github.com/nikshepsvn/blindcache/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache 2.0" /></a>
  <a href="https://github.com/nikshepsvn/blindcache/blob/main/CHANGELOG.md"><img src="https://img.shields.io/badge/release-v0.1.0-blue.svg" alt="v0.1.0" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-blue.svg" alt="MCP compatible" /></a>
  <a href="https://nillion.com"><img src="https://img.shields.io/badge/Nillion-Blind%20Computer-blue.svg" alt="Nillion Blind Computer" /></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#tools">Tools</a> ·
  <a href="#performance">Performance</a> ·
  <a href="#wire-into-claude-code">Claude Code</a> ·
  <a href="#whats-next">What's next</a>
</p>

---

## Why

Every AI agent today re-asks you for the same context. Mem0, Letta, Zep, ChatGPT memory — all useful, all centralized: the provider can read your plaintext. BlindCache is the same shape (an MCP server exposing `memory_*` tools) but the substrate is Nillion's **Blind Computer**: content is split into Shamir-style shares across three nilDB nodes, and the SDK only ever recombines them on your machine. To the agent, it feels like a normal memory layer. To the operator, it's noise.

## Architecture in one diagram

```
┌──────────────┐    memory_*    ┌──────────────────┐    encrypted shares     ┌──────────────────┐
│ Claude Code  │ ─────────────► │  blindcache-mcp  │ ──────────────────────► │ nilDB node 1     │
│ Cursor       │   stdio / HTTP │   (this repo)    │ ──────────────────────► │ nilDB node 2     │
│ any agent    │ ◄───────────── │                  │ ──────────────────────► │ nilDB node 3     │
└──────────────┘   plaintext    └──────────────────┘    shares re-combine    └──────────────────┘
                                       │
                                       │  optional: auto-tag + summarize
                                       ▼
                                ┌──────────────────┐
                                │   nilAI (TEE)    │
                                └──────────────────┘
```

Plaintext only ever exists inside the MCP process and (briefly, inside an enclave) inside nilAI when auto-tagging is on. Nothing else.

## Tools

| Tool | What it does |
|---|---|
| `memory_append` | Store one encrypted memory. Auto-tagged via nilAI when configured. |
| `memory_bulk_append` | Up to 200 entries in a single round trip. |
| `memory_search` | Plaintext filters (`tags` / `source` / `scope` / `since` / `before` / cursor) server-side. Optional `query` string runs client-side after decryption. |
| `memory_list` | Recent-first listing, scope-aware. |
| `memory_get` | Fetch a single decrypted memory by id. |
| `memory_update` | Edit content / tags / source / scope of an entry by id. |
| `memory_delete` | Permanent removal by id. |
| `memory_summary` | Pull memories matching a filter, summarize via nilAI. Requires `NILLION_API_KEY`. |

## Quick start

```bash
pnpm install
pnpm smoke          # full CRUD + filters + cursor + update + bulk against testnet
```

That generates an ephemeral builder keypair, registers with Nillion testnet, creates a collection, writes 10 encrypted memories, runs every filter variant, paginates, updates, bulk-inserts, and prints latency. No env vars required.

For persistent memory across restarts, get a real key:

```bash
pnpm keygen         # prints PRIVATE KEY + DID
# paste the key into .env as NIL_BUILDER_PRIVATE_KEY
pnpm build
pnpm dev:mcp        # stdio
```

## Wire into Claude Code

Add to `~/.claude/claude_desktop_config.json` (or a per-project `.mcp.json`):

```json
{
  "mcpServers": {
    "blindcache": {
      "command": "node",
      "args": ["/absolute/path/to/blindcache/packages/blindcache-mcp/dist/server.js"],
      "env": {
        "NIL_BUILDER_PRIVATE_KEY": "your-hex-private-key-here",
        "NILLION_API_KEY": "optional — unlocks auto-tag + memory_summary"
      }
    }
  }
}
```

Restart Claude Code. Your agent now has `memory_*` tools.

## HTTP mode

Run as a local HTTP server multiple agents can share, instead of spawning a new stdio process per agent:

```bash
BLINDCACHE_HTTP_PORT=3737 BLINDCACHE_HTTP_TOKEN=$(uuidgen) pnpm dev:mcp
# health: curl http://127.0.0.1:3737/health
# mcp:    POST http://127.0.0.1:3737/mcp  with `Authorization: Bearer <token>`
```

`BLINDCACHE_HTTP_TOKEN` is required — the server refuses to listen otherwise.

## Switching from testnet to mainnet

Testnet is permissive — write all you want, no payment. Mainnet is the real, decentralized network: four nodes operated by Nillion, PairPoint, STC Bahrain, and Deutsche Telekom MMS. To flip:

**1. Subscribe via the developer portal.** Open [`portal.nillion.com`](https://portal.nillion.com), connect a Keplr wallet, and subscribe to nilDB. Both nilDB and nilAI have a free tier; beyond it you burn NIL → credits → assign to specific nodes. The portal walks you through it; no email or credit card required.

**2. Point `NILDB_NODES` at the mainnet cluster.** Override the env var (default is testnet):

```bash
NILDB_NODES="https://nildb-5ab1.nillion.network,https://nildb-f496.pairpointweb3.io,https://nildb-f375.stcbahrain.net,https://nildb-2140.staking.telekom-mms.com"
```

**3. Use the builder key the portal generated.** Set `NIL_BUILDER_PRIVATE_KEY` to the key from your subscription — that's the DID the network knows you by.

**4. Re-run.** Nothing else changes. Same SDK, same MCP tools, same code. The collection auto-creates on first call; new builder = new vault.

> Migration note: there is no automatic data migration from testnet to mainnet. Treat testnet as scratch space.

## Performance

Numbers from `pnpm smoke` against `nildb-stg-n{1,2,3}.nillion.network` — measured **from Southeast Asia (India) while traveling**, talking to a US/EU staging cluster. The numbers below are with that ~250 ms baseline round-trip already baked in. Closer to the nodes, expect roughly half this.

| Operation | Latency |
|---|---|
| `vault.open()` (one-time) | 3-5 s |
| `append` median / p95 | ~335 ms / ~1.2 s |
| `bulkAppend(5)` | ~370 ms |
| `update` (re-encrypt + write) | ~600 ms |
| `search` (scope filter) | ~330 ms |
| `search` (query + scope) | ~320 ms |
| `search` (time-range) | ~310 ms |
| `search` (cursor page) | ~315 ms |
| `delete` | ~315 ms |
| `summarize` (nilAI) | requires `NILLION_API_KEY` |

Decryption round-trip is verified end-to-end in the smoke test.

## Auto-tag and summarize (nilAI)

If `NILLION_API_KEY` is set, every `memory_append` is augmented with 2-5 LLM-suggested topical tags via [nilAI](https://docs.nillion.com/blind-computer/build/llms/quickstart) — an OpenAI-compatible endpoint that runs the model inside a Trusted Execution Environment. The same key unlocks `memory_summary` for digesting filter results.

```
"Pair-programmed with Maya on Stripe webhook retry logic…"
  → [stripe, webhooks, retry-logic, maya]
```

> **Privacy trade-off, named honestly:** nilAI is TEE-based, not MPC. Plaintext is briefly visible to the model inside the enclave during inference. The vault itself remains MPC-encrypted at rest. If your threat model requires that no Nillion infrastructure ever sees plaintext, leave `NILLION_API_KEY` unset and tag manually.

## Repo layout

```
packages/
  blindcache-core/   Vault wrapper over @nillion/secretvaults — CRUD, bulk, summarize, auto-tag
  blindcache-mcp/    MCP server (stdio + HTTP) exposing memory_* tools
scripts/
  fix-libsodium.mjs  Postinstall workaround for an upstream libsodium ESM packaging bug
docs/
  banner.jpg         The wallpaper above
```

## Gotchas (so the next person doesn't waste a day)

<details>
<summary>Click to expand the list of things I burned a day on</summary>

1. **Schema root must be `type: "array"` with `items`** — root `type: "object"` is rejected as `"must be object"` because nilDB validates the whole batch, not each record.
2. **`Signer.getDid()` returns a `Did` object, not a string** — use `.didString`. `.toString()` returns `[object Object]` and registration fails with `"Token subject does not match registration DID"`.
3. **libsodium-wrappers-sumo ESM build is broken on pnpm** — its build references `./libsodium-sumo.mjs` which actually lives in the sibling `libsodium-sumo` package. `scripts/fix-libsodium.mjs` symlinks it on `pnpm install`.
4. **Plaintext-only updates fail under blindfold** — the SDK's blindfold layer expects every write body to contain a `%allot` field so it can fan out into one share per node. We always include `content` (re-fetched if not changing) to keep blindfold happy. Cost: one extra read per update.
5. **Collections are immutable** — bumping the schema (e.g. adding `scope` in v2) requires a new collection. Existing entries in older collections stay queryable under their old schema; just don't expect cross-version writes.
6. **One bad node breaks reads** — the SDK retries 5× per node on transient errors, but if one node is permanently down, `findData` throws (no 2-of-3 fallback yet). Bypassing this requires forking the SDK.

</details>

## What this proves

- Nillion testnet works headlessly. No MetaMask, no browser. `pnpm keygen` + `pnpm smoke` is enough.
- Sub-500ms encrypted writes / reads from a US laptop to a 3-node staging cluster.
- The full CRUD + filter + paginate + bulk + summarize loop runs end-to-end.
- An MCP server is a viable distribution channel — the vault feels like a normal `memory.*` to the agent; the encryption is invisible.

## What's next

Tier 2 — the Nillion-native differentiation, where this stops being "a memory layer" and becomes a primitive nothing else can build:

- **Owned collections + per-document ACLs** → user owns vault, multiple apps coexist with scoped access.
- **OAuth-shape scope handoff** → third-party apps request scoped delegation tokens; user approves via a dashboard. Plaid Link, but for memory.
- **Cross-user compute (Nada)** → first MPC program: shared tag overlap between two users, neither sees the other's tags. The viral demo.
- **Encrypted semantic search (Nada)** → top-k over encrypted embeddings, server-side.
- **Field-level disclosure** → an app reads `tags` but not `content`.
- **2-of-3 read tolerance** → fork the SDK's cluster fanout so one missing node doesn't kill reads.
- **Lit Protocol PKP identity** → passkey-based identity, multi-device, social recovery.

## License

[Apache 2.0](LICENSE) © 2026 Nikshep Svn. Patent grant included; use commercially, fork freely.

## Contributing

Issues and PRs welcome. The project is intentionally small — keep new code in the same shape: thin wrappers over `@nillion/secretvaults`, no opinionated state machines, no business logic that doesn't earn its weight. See [CHANGELOG.md](CHANGELOG.md) for what's shipped.

---

<p align="center"><sub>built against Nillion's <a href="https://nillion.com">Blind Computer</a>. you can't read what isn't there.</sub></p>
