// Opaque pagination cursor.
// Encodes (timestamp, id) — sufficient for stable ordering on a "sort by
// timestamp DESC, then id" page. Base64-url for URL safety in MCP args.
export type Cursor = { timestamp: string; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(s: string): Cursor | null {
  try {
    const json = Buffer.from(s, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.timestamp === "string" &&
      typeof parsed.id === "string"
    ) {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return null;
}
