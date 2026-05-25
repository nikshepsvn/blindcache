// Minimal Venice client — OpenAI-compatible, streams via SSE.
// Runs entirely in the browser. In production the apiKey comes from
// IndexedDB (set during onboarding); in dev it's NEXT_PUBLIC_VENICE_API_KEY.

const VENICE_BASE = "https://api.venice.ai/api/v1";

export type VeniceMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StreamOptions = {
  apiKey: string;
  model: string;
  messages: VeniceMessage[];
  signal?: AbortSignal;
};

export async function* streamVeniceChat({
  apiKey,
  model,
  messages,
  signal,
}: StreamOptions): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${VENICE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Venice API ${res.status}: ${body.slice(0, 200)}`);
  }
  if (!res.body) throw new Error("Venice returned empty body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // Many LLM tokenizers prefix the first content token with whitespace —
  // strip leading whitespace until we've emitted real text.
  let started = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        let delta: string | undefined = json?.choices?.[0]?.delta?.content;
        if (!delta) continue;
        if (!started) {
          delta = delta.replace(/^\s+/, "");
          if (!delta) continue;
          started = true;
        }
        yield delta;
      } catch {
        // Skip malformed lines silently — common in SSE streams.
      }
    }
  }
}

export function getVeniceKey(): string {
  const k = process.env.NEXT_PUBLIC_VENICE_API_KEY ?? "";
  if (!k) {
    throw new Error(
      "NEXT_PUBLIC_VENICE_API_KEY missing. Set it in apps/chat/.env.local."
    );
  }
  return k;
}

export function getVeniceModel(): string {
  return process.env.NEXT_PUBLIC_VENICE_MODEL ?? "e2ee-qwen3-30b-a3b-p";
}

/**
 * Curated TEE + E2EE-capable Venice models.
 * Source: GET https://api.venice.ai/api/v1/models where capabilities
 * supportsTeeAttestation && supportsE2EE are both true.
 * Updated 2026-05-25; refresh as Venice ships new models.
 */
export type VeniceModel = {
  id: string;
  label: string;
  contextK: number;
  privacy: "tee+e2ee";
  note?: string;
};

export const VENICE_PRIVATE_MODELS: VeniceModel[] = [
  { id: "e2ee-qwen3-30b-a3b-p",              label: "qwen3 30b",          contextK: 256, privacy: "tee+e2ee", note: "long context · default" },
  { id: "e2ee-glm-5-1",                      label: "glm 5.1",            contextK: 200, privacy: "tee+e2ee" },
  { id: "e2ee-glm-4-7-flash-p",              label: "glm 4.7 flash",      contextK: 198, privacy: "tee+e2ee", note: "fast" },
  { id: "e2ee-gpt-oss-120b-p",               label: "gpt-oss 120b",       contextK: 128, privacy: "tee+e2ee", note: "biggest" },
  { id: "e2ee-gpt-oss-20b-p",                label: "gpt-oss 20b",        contextK: 128, privacy: "tee+e2ee" },
  { id: "e2ee-qwen3-5-122b-a10b",            label: "qwen3.5 122b",       contextK: 128, privacy: "tee+e2ee" },
  { id: "e2ee-qwen3-6-35b-a3b-uncensored-p", label: "qwen3.6 35b unc.",   contextK: 128, privacy: "tee+e2ee", note: "uncensored" },
  { id: "e2ee-qwen3-vl-30b-a3b-p",           label: "qwen3 vl 30b",       contextK: 128, privacy: "tee+e2ee", note: "vision" },
  { id: "e2ee-glm-4-7-p",                    label: "glm 4.7",            contextK: 128, privacy: "tee+e2ee" },
  { id: "e2ee-gemma-4-26b-a4b-uncensored-p", label: "gemma 4 26b unc.",   contextK: 64,  privacy: "tee+e2ee" },
  { id: "e2ee-gemma-3-27b-p",                label: "gemma 3 27b",        contextK: 40,  privacy: "tee+e2ee" },
  { id: "e2ee-venice-uncensored-24b-p",      label: "venice unc. 24b",    contextK: 32,  privacy: "tee+e2ee", note: "uncensored" },
  { id: "e2ee-qwen3-6-35b-a3b",              label: "qwen3.6 35b",        contextK: 32,  privacy: "tee+e2ee" },
  { id: "e2ee-qwen-2-5-7b-p",                label: "qwen 2.5 7b",        contextK: 32,  privacy: "tee+e2ee", note: "small/fast" },
  { id: "e2ee-gemma-4-31b",                  label: "gemma 4 31b",        contextK: 32,  privacy: "tee+e2ee" },
];
