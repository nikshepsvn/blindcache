// Parse user-supplied time inputs into ISO timestamps for nilDB queries.
// Accepts:
//   - number  → ms timestamp
//   - Date    → as-is
//   - string of form "7d", "1w", "24h", "30m", "60s" → relative to now (past)
//   - any other string → forwarded to new Date() (handles ISO, RFC 2822, etc.)
export function parseTime(input: string | number | Date): string {
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "number") return new Date(input).toISOString();

  const m = input.trim().match(/^(\d+)\s*(s|m|h|d|w)$/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2]!.toLowerCase();
    const seconds =
      unit === "s" ? n :
      unit === "m" ? n * 60 :
      unit === "h" ? n * 3600 :
      unit === "d" ? n * 86400 :
      n * 86400 * 7; // w
    return new Date(Date.now() - seconds * 1000).toISOString();
  }

  const d = new Date(input);
  if (Number.isNaN(d.valueOf())) {
    throw new Error(`Unparseable time: ${JSON.stringify(input)}`);
  }
  return d.toISOString();
}
