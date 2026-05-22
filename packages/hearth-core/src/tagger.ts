import { NilaiOpenAIClient } from "@nillion/nilai-ts";

export type TaggerConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTags?: number;
  timeoutMs?: number;
};

const SYSTEM_PROMPT = `You extract topical tags from a memory entry written by an AI agent or its user.

Rules:
- Return ONLY a JSON array of 2-5 short lowercase tags.
- Each tag: 1-3 words, no punctuation, no special characters.
- Prefer topic/project/domain tags ("rust", "billing", "interview"), not generic action verbs.
- No filler tags like "note", "memory", "info", "todo" — those add no signal.
- Output ONLY the JSON array. No prose, no code fences, no explanation.

Example input: "Discussed the Stripe webhook retry logic with Maya — we need to handle 5xx with exponential backoff and cap at 6 attempts."
Example output: ["stripe","webhooks","retry-logic","maya"]`;

const DEFAULT_BASE_URL = "https://api.nilai.nillion.network/nuc/v1/";
const DEFAULT_MODEL = "google/gemma-4-26B-A4B-it";
const DEFAULT_MAX_TAGS = 5;
const DEFAULT_TIMEOUT_MS = 8000;

export class Tagger {
  private constructor(
    private readonly client: NilaiOpenAIClient,
    private readonly model: string,
    private readonly maxTags: number,
    private readonly timeoutMs: number
  ) {}

  static maybeCreate(config: TaggerConfig): Tagger | null {
    if (!config.apiKey) return null;
    const client = new NilaiOpenAIClient({
      baseURL: config.baseUrl ?? DEFAULT_BASE_URL,
      apiKey: config.apiKey,
    });
    return new Tagger(
      client,
      config.model ?? DEFAULT_MODEL,
      config.maxTags ?? DEFAULT_MAX_TAGS,
      config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );
  }

  async suggest(content: string): Promise<string[]> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.timeoutMs);
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: content.slice(0, 4000) },
          ],
          temperature: 0.2,
          max_tokens: 80,
        },
        { signal: ac.signal }
      );
      const raw = response.choices[0]?.message?.content ?? "";
      return this.parse(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[tagger] suggestion failed: ${msg}`);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private parse(raw: string): string[] {
    const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    const match = trimmed.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const norm = item
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 30);
      if (!norm || norm.length < 2) continue;
      if (seen.has(norm)) continue;
      seen.add(norm);
      out.push(norm);
      if (out.length >= this.maxTags) break;
    }
    return out;
  }
}
