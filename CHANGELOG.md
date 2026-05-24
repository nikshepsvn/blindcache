# Changelog

All notable changes to BlindCache. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] — 2026-05-24

Client-side semantic search shipped. Embeddings happen in-process via [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) (q8 quantized, ~23 MB, 384-dim) — content never leaves the SDK to be embedded. Vectors are stored plaintext alongside encrypted content; cosine ranking runs client-side after fetch.

This is a strict privacy upgrade over mem0 / Letta / Zep, which send your plaintext to OpenAI's embedding API on every write.

### Added

- `Embedder` — lazy-loaded singleton; pulls the model on first use.
- `vault.search({ semantic: "query" })` — embeds the query locally, narrows candidates by structured filter (overscan 10×), ranks by cosine, returns top-K with per-result `score`.
- `vault.warmEmbedder()` — pre-load the model if you want first append/search to be instant.
- `MemoryEntry.embedding?: number[]` and `MemoryEntry.score?: number` fields.
- Schema **v3**: `embedding` plaintext array field, 384-dim. *Bumping the schema version creates a new collection; v2 collections stay queryable under their old schema but won't get vectors on new writes.*
- `BLINDCACHE_EMBED_MODEL` and `BLINDCACHE_EMBED_DTYPE` env vars for swapping the embedding model.
- MCP `memory_search` now accepts `semantic` — preferred over `query` for real recall.

### v0.2 latency benchmarks (testnet, from Southeast Asia)

- `vault.open()`: ~1.9 s (down from 3–5 s, the open path got tighter)
- Model load (one-time, cached after first download): ~80 ms warm / ~3 s cold
- `append` (auto-tag + embed in parallel): median ~210 ms, p95 ~310 ms — *faster* than v0.1 because the local embed overlaps with the network write
- `semantic search` (embed query + fetch + rank): median ~370 ms, p95 ~530 ms
- All 4 test queries returned the correct top result on first try (100% top-1 accuracy on a 10-entry vault)

### Changed

- `MemoryEntry` shape: added `embedding` and `score`; existing fields unchanged.
- `vault.update({ content })` now re-embeds when content changes.

### Privacy footnote (honest)

Embeddings are stored **plaintext** in v0.2. An adversary scraping all 3 nilDB nodes could not reconstruct your text from vectors, but could see semantic clusters. A future v0.3 will encrypt embeddings via `%allot` (Path B), and v0.4 will explore server-side cosine via Nada AI MPC (where neither the query nor the stored vectors are ever decrypted).

## [0.1.0] — 2026-05-22

Initial public release. Phase 0 spike + Tier 1 features. Published to npm 2026-05-24:

- [`blindcache-mcp`](https://www.npmjs.com/package/blindcache-mcp) — run with `npx blindcache-mcp`
- [`blindcache-core`](https://www.npmjs.com/package/blindcache-core) — `npm i blindcache-core`

### Added

- `blindcache-core` — vault wrapper over `@nillion/secretvaults` v3
  - `append`, `bulkAppend`, `get`, `search`, `list`, `update`, `delete`, `summarize`
  - Plaintext fields (`tags`, `source`, `scope`, `timestamp`) queryable server-side
  - Content encrypted across 3 nilDB nodes via `%allot` / `%share` (Shamir shares)
  - Time-range filters: ISO, ms epoch, or relative ("7d", "24h", "15m")
  - Cursor-based pagination (base64url of timestamp + id)
  - Scope/namespace field (`personal`, `work`, `code`, etc.)
- `blindcache-mcp` — Model Context Protocol server
  - Stdio transport (default) for Claude Code / Cursor / Windsurf
  - Streamable HTTP transport with bearer-token auth (`BLINDCACHE_HTTP_PORT` + `BLINDCACHE_HTTP_TOKEN`)
  - Eight `memory_*` tools: append, bulk_append, search, list, get, update, delete, summary
  - `/health` endpoint for ops visibility
- Auto-tagging via [nilAI](https://docs.nillion.com/blind-computer/build/llms/quickstart) (TEE-based, OpenAI-compatible)
- `memory_summary` via nilAI for LLM digests of filtered memories
- `pnpm keygen` helper for generating persistent builder keypairs
- Configuration validation at startup with friendly error messages (no more hex-parse stack traces)
- Postinstall workaround for upstream `libsodium-wrappers-sumo` ESM packaging bug
- Apache-2.0 license

### Phase 0 latency benchmarks

Measured from Southeast Asia (India) to a US/EU staging cluster, so the
~250 ms baseline round-trip is already baked in. Closer to the nodes,
expect roughly half this.

- `vault.open()` one-time: 3–5 s
- `append` median / p95: ~335 ms / ~1.2 s
- `search` (filter only): ~330 ms
- `update` (with re-encryption): ~600 ms
- `delete`: ~315 ms

### Known limitations

See README "Gotchas" section. Tracked highlights:

- One bad node breaks reads (no 2-of-3 fallback yet — needs SDK fork)
- Plaintext-only updates require an extra read (blindfold layer needs `%allot`)
- Collections are immutable, so schema bumps abandon old data
