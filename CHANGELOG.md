# Changelog

All notable changes to BlindCache. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] — 2026-05-22

Initial public release. Phase 0 spike + Tier 1 features.

### Added

- `blindcache-core` — vault wrapper over `@nillion/secretvaults` v3
  - `append`, `bulkAppend`, `search`, `list`, `update`, `delete`, `summarize`
  - Plaintext fields (`tags`, `source`, `scope`, `timestamp`) queryable server-side
  - Content encrypted across 3 nilDB nodes via `%allot` / `%share` (Shamir shares)
  - Time-range filters: ISO, ms epoch, or relative ("7d", "24h", "15m")
  - Cursor-based pagination (base64url of timestamp + id)
  - Scope/namespace field (`personal`, `work`, `code`, etc.)
- `blindcache-mcp` — Model Context Protocol server
  - Stdio transport (default) for Claude Code / Cursor / Windsurf
  - Streamable HTTP transport with bearer-token auth (`BLINDCACHE_HTTP_PORT` + `BLINDCACHE_HTTP_TOKEN`)
  - Seven `memory_*` tools: append, bulk_append, search, list, update, delete, summary
  - `/health` endpoint for ops visibility
- Auto-tagging via [nilAI](https://docs.nillion.com/blind-computer/build/llms/quickstart) (TEE-based, OpenAI-compatible)
- `memory_summary` via nilAI for LLM digests of filtered memories
- `pnpm keygen` helper for generating persistent builder keypairs
- Postinstall workaround for upstream `libsodium-wrappers-sumo` ESM packaging bug
- Apache-2.0 license

### Phase 0 latency benchmarks (testnet, US laptop)

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
