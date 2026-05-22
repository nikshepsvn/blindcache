// JSON Schema for a Hearth memory entry.
// Plaintext fields (timestamp, tags, source, scope) stay queryable.
// content is encrypted across all nilDB nodes via the %share marker.
//
// Schema version is reflected in the collection name suffix below; bumping
// it forces a fresh collection on next run (Phase 0 has no migration story).
export const SCHEMA_VERSION = "v2";

export const MEMORY_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "HearthEntries",
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
      content: {
        type: "object",
        required: ["%share"],
        properties: { "%share": { type: "string" } },
      },
    },
  },
} as const;
