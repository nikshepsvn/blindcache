// JSON Schema for a BlindCache memory entry.
// Plaintext fields (timestamp, tags, source, scope, embedding) stay queryable
// and rankable client-side. content is encrypted across all nilDB nodes via
// the %share marker.
//
// Schema version is reflected in the collection name suffix below; bumping
// it forces a fresh collection on next run (Phase 0 has no migration story).
//
// v3 adds an `embedding` plaintext field (384-dim float array) for
// client-side semantic search via cosine similarity. The vector itself is
// computed locally by the SDK using a small on-device model, so no plaintext
// content ever leaves your machine to be embedded.
export const SCHEMA_VERSION = "v3";

export const EMBEDDING_DIM = 384;

export const MEMORY_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "BlindCacheEntries",
  type: "array",
  items: {
    type: "object",
    required: ["_id", "timestamp", "tags", "source", "scope", "content"],
    properties: {
      _id: { type: "string", format: "uuid" },
      timestamp: { type: "string", format: "date-time" },
      tags: {
        type: "array",
        items: { type: "string" },
      },
      source: { type: "string" },
      scope: { type: "string" },
      embedding: {
        type: "array",
        items: { type: "number" },
        minItems: EMBEDDING_DIM,
        maxItems: EMBEDDING_DIM,
      },
      content: {
        type: "object",
        required: ["%share"],
        properties: { "%share": { type: "string" } },
      },
    },
  },
} as const;
