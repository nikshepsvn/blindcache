# Hearth

A personal context layer built on [Nillion](https://nillion.com) — encrypted memory that you own, that every AI agent and app you use can read and write to with your permission.

This repo is the **Phase 0 spike**: a working MCP server backed by an encrypted Nillion vault. Drop it into Claude Code / Cursor / any MCP-capable agent and the model gets `memory_append` / `memory_search` / `memory_list` / `memory_delete` tools. Memory content lives encrypted-and-sharded across three nilDB nodes; no node — and no operator — can read it on its own.

## What's here

```
packages/
  hearth-core/   Vault wrapper over @nillion/secretvaults — open(), append, search, list, delete
  hearth-mcp/    MCP server (stdio) exposing memory_* tools
scripts/
  fix-libsodium.mjs  Postinstall workaround for an upstream libsodium ESM packaging bug
```

## Phase 0 results (testnet, May 2026)

Real numbers from the smoke test against `nildb-stg-n{1,2,3}.nillion.network`:

| Operation                        | Latency |
| -------------------------------- | ------- |
| `vault.open()` (one-time)        | 3.3 s   |
| `append` median                  | 349 ms  |
| `append` p95                     | 477 ms  |
| `search` (server filter)         | 333 ms  |
| `search` w/ tag filter           | 340 ms  |
| `search` w/ client-side query    | 357 ms  |
| `delete`                         | 299 ms  |

Decryption was verified round-trip: searching for `"fox 7"` returned the exact plaintext written by `append #7`. So the MCP surface is genuinely viable for interactive UX.

## Run the smoke test

```bash
pnpm install
pnpm smoke
```

That generates an ephemeral builder keypair, registers with the testnet, creates a collection, writes 10 encrypted memories, runs three searches, deletes one, and prints latency. No env vars required.

## Run the MCP server locally

```bash
pnpm build
pnpm dev:mcp
```

It listens on stdio. To wire into Claude Code, add to `~/.claude/claude_desktop_config.json` (or per-project `.mcp.json`):

```json
{
  "mcpServers": {
    "hearth": {
      "command": "node",
      "args": ["/absolute/path/to/hearth/packages/hearth-mcp/dist/server.js"],
      "env": {
        "NIL_BUILDER_PRIVATE_KEY": "your-hex-private-key-here"
      }
    }
  }
}
```

For persistent memory across sessions, set `NIL_BUILDER_PRIVATE_KEY` to a real hex key (see `.env.example`). Without it, every restart spins up a fresh ephemeral builder and loses the previous collection.

## Tools exposed by the MCP server

- `memory_append({ content, tags?, source? })` — store an encrypted memory.
- `memory_search({ query?, tags?, source?, limit? })` — server filters on tags/source (plaintext), client filters on `query` against decrypted content.
- `memory_list({ limit? })` — most recent memories.
- `memory_delete({ id })` — permanent removal.

## Known gotchas

1. **Schema must be `type: "array"` at root** — `items.<entry>` defines each record. A root `type: "object"` schema gets rejected as "must be object" because nilDB validates the whole batch.
2. **`Signer.getDid()` returns a `Did` object, not a string** — `.didString` is what you want; `.toString()` returns `[object Object]` and registration fails with `"Token subject does not match registration DID"`.
3. **libsodium-wrappers-sumo ESM build is broken on pnpm** — its build references `./libsodium-sumo.mjs` which is actually a sibling package. `scripts/fix-libsodium.mjs` symlinks it into place on `pnpm install`.
4. **Each node sees one secret share** — the `%allot` write marker triggers Shamir-style splitting; the schema stores each share as `{ "%share": "..." }` on the corresponding node.

## What this proves

- Nillion testnet is real and the v3 secretvaults SDK works headlessly (no MetaMask required).
- Sub-500ms encrypted writes/reads from a US laptop to a 3-node staging cluster are achievable today.
- An MCP server is a viable distribution channel — the vault feels like a normal `memory.search`/`memory.append` to the agent, the encryption is invisible.

## What's next (not in this spike)

- Real builder identity + key recovery (Lit Protocol PKPs)
- Owned collections + per-document ACLs so multiple agents/apps can share a user's vault
- Browser extension to capture from ChatGPT/Claude/Perplexity into the same vault
- Nada programs for cross-user compute (group memory, fuzzy matching)
- Web/desktop app — the canonical human-facing surface
