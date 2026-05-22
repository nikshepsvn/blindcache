import { NilaiOpenAIClient } from "@nillion/nilai-ts";

export type NilaiConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTags?: number;
  timeoutMs?: number;
};

const TAG_SYSTEM = `You extract topical tags from a memory entry written by an AI agent or its user.

Rules:
- Return ONLY a JSON array of 2-5 short lowercase tags.
- Each tag: 1-3 words, no punctuation, no special characters.
- Prefer topic/project/domain tags ("rust", "billing", "interview"), not generic action verbs.
- No filler tags like "note", "memory", "info", "todo" — those add no signal.
- Output ONLY the JSON array. No prose, no code fences, no explanation.

Example input: "Discussed the Stripe webhook retry logic with Maya — we need to handle 5xx with exponential backoff and cap at 6 attempts."
Example output: ["stripe","webhooks","retry-logic","maya"]`;

const SUMMARY_SYSTEM = `You summarize a set of personal memory entries for the user who wrote them.

Rules:
- Be concise. 3-6 short bullet points OR 1-3 short paragraphs.
- Surface concrete facts, decisions, todos. Skip filler.
- Group related items. Order by importance, not chronology.
- Use the user's own phrasing where possible. Don't invent details.
- If the user provides an instruction, follow it; otherwise produce a neutral digest.
- Plain text only. No markdown headers.`;

const DEFAULT_BASE_URL = "https://api.nilai.nillion.network/nuc/v1/";
const DEFAULT_MODEL = "google/gemma-4-26B-A4B-it";
const DEFAULT_MAX_TAGS = 5;
const DEFAULT_TIMEOUT_MS = 8000;

export class Nilai {
  private constructor(
    private readonly client: NilaiOpenAIClient,
    private readonly model: string,
    private readonly maxTags: number,
    private readonly timeoutMs: number
  ) {}

  static maybeCreate(config: NilaiConfig): Nilai | null {
    if (!config.apiKey) return null;
    const client = new NilaiOpenAIClient({
      baseURL: config.baseUrl ?? DEFAULT_BASE_URL,
      apiKey: config.apiKey,
    });
    return new Nilai(
      client,
      config.model ?? DEFAULT_MODEL,
      config.maxTags ?? DEFAULT_MAX_TAGS,
      config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );
  }

  async suggestTags(content: string): Promise<string[]> {
    const raw = await this.complete(TAG_SYSTEM, content.slice(0, 4000), 80, 0.2);
    return this.parseTags(raw);
  }

  async summarize(
    entries: { timestamp: string; tags: string[]; content: string }[],
    instruction?: string
  ): Promise<string> {
    if (entries.length === 0) return "(no memories matched)";
    const lines = entries.map((e, i) => {
      const tags = e.tags.length ? ` [${e.tags.join(",")}]` : "";
      return `${i + 1}. (${e.timestamp.slice(0, 10)})${tags} ${e.content}`;
    });
    const user = [
      instruction ? `Instruction: ${instruction}\n` : "",
      `Memories:\n${lines.join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n");
    const raw = await this.complete(SUMMARY_SYSTEM, user, 600, 0.3);
    return raw.trim() || "(empty summary)";
  }

  private async complete(
    system: string,
    user: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.timeoutMs);
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature,
          max_tokens: maxTokens,
        },
        { signal: ac.signal }
      );
      return response.choices[0]?.message?.content ?? "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[nilai] completion failed: ${msg}`);
      return "";
    } finally {
      clearTimeout(timer);
    }
  }

  private parseTags(raw: string): string[] {
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

// Back-compat aliases — the public API used to be named Tagger.
export { Nilai as Tagger };
export type { NilaiConfig as TaggerConfig };
