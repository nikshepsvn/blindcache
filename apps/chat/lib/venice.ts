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
 * Source: GET https://api.venice.ai/api/v1/models where
 * supportsTeeAttestation && supportsE2EE.
 * Fields populated from Venice's own metadata (ctx, pricing, capabilities,
 * descriptions). Ordered by output price descending — a rough proxy for
 * model capability tier. Refresh from the live endpoint as Venice ships.
 * Last sync: 2026-05-25.
 */
export type VeniceTag =
  | "flagship"
  | "reasoning"
  | "code"
  | "vision"
  | "tools"
  | "long-ctx"
  | "uncensored"
  | "fast";

export type VeniceModel = {
  id: string;
  label: string;
  family: string;          // GLM / Qwen / GPT-OSS / Gemma / Venice
  contextK: number;
  /** USD per million output tokens — the headline price */
  outPerMtok: number;
  /** USD per million input tokens */
  inPerMtok: number;
  description: string;     // unique part, TEE boilerplate stripped
  tags: VeniceTag[];
};

// Sorted by output price descending (capability proxy).
export const VENICE_PRIVATE_MODELS: VeniceModel[] = [
  {
    id: "e2ee-glm-4-7-p",
    label: "GLM 4.7",
    family: "GLM",
    contextK: 128,
    outPerMtok: 4.15,
    inPerMtok: 1.1,
    description: "Z.AI flagship — enhanced programming, stable multi-step reasoning.",
    tags: ["flagship", "reasoning", "code"],
  },
  {
    id: "e2ee-glm-5-1",
    label: "GLM 5.1",
    family: "GLM",
    contextK: 200,
    outPerMtok: 4.15,
    inPerMtok: 1.1,
    description: "Next-gen GLM with extended reasoning and longer context.",
    tags: ["flagship", "reasoning", "long-ctx"],
  },
  {
    id: "e2ee-qwen3-5-122b-a10b",
    label: "Qwen3.5 122B A10B",
    family: "Qwen",
    contextK: 128,
    outPerMtok: 4.0,
    inPerMtok: 0.5,
    description: "Largest open MoE on offer — reasoning, multimodal, tools.",
    tags: ["flagship", "reasoning", "vision", "tools"],
  },
  {
    id: "e2ee-qwen3-6-35b-a3b-uncensored-p",
    label: "Qwen3.6 35B Uncensored",
    family: "Qwen",
    contextK: 128,
    outPerMtok: 1.88,
    inPerMtok: 0.38,
    description: "Alibaba's MoE with 35B total / 3B active — uncensored variant.",
    tags: ["uncensored"],
  },
  {
    id: "e2ee-qwen3-6-35b-a3b",
    label: "Qwen3.6 35B FP8",
    family: "Qwen",
    contextK: 32,
    outPerMtok: 1.18,
    inPerMtok: 0.182,
    description: "Fast MoE — 3B active per token, reasoning + tools.",
    tags: ["reasoning", "code", "tools", "fast"],
  },
  {
    id: "e2ee-venice-uncensored-24b-p",
    label: "Venice Uncensored 1.1",
    family: "Venice",
    contextK: 32,
    outPerMtok: 1.15,
    inPerMtok: 0.25,
    description: "Venice's own uncensored 24B — strong general assistant.",
    tags: ["uncensored"],
  },
  {
    id: "e2ee-qwen3-vl-30b-a3b-p",
    label: "Qwen3 VL 30B",
    family: "Qwen",
    contextK: 128,
    outPerMtok: 0.9,
    inPerMtok: 0.25,
    description: "Multimodal — unifies text with image + video understanding.",
    tags: ["vision", "tools"],
  },
  {
    id: "e2ee-gemma-4-26b-a4b-uncensored-p",
    label: "Gemma 4 26B Uncensored",
    family: "Gemma",
    contextK: 64,
    outPerMtok: 0.88,
    inPerMtok: 0.19,
    description: "Google's Gemma 4 MoE — 25B total / 4B active, multimodal.",
    tags: ["uncensored"],
  },
  {
    id: "e2ee-qwen3-30b-a3b-p",
    label: "Qwen3 30B A3B",
    family: "Qwen",
    contextK: 256,
    outPerMtok: 0.69,
    inPerMtok: 0.19,
    description: "MoE with 30B total / 3B active, ultra-long 256k context.",
    tags: ["long-ctx", "tools"],
  },
  {
    id: "e2ee-gpt-oss-120b-p",
    label: "GPT OSS 120B",
    family: "GPT-OSS",
    contextK: 128,
    outPerMtok: 0.65,
    inPerMtok: 0.13,
    description: "OpenAI's open-weight 117B MoE — configurable reasoning depth.",
    tags: ["reasoning"],
  },
  {
    id: "e2ee-glm-4-7-flash-p",
    label: "GLM 4.7 Flash",
    family: "GLM",
    contextK: 198,
    outPerMtok: 0.55,
    inPerMtok: 0.13,
    description: "30B-class — agentic coding, long-horizon planning.",
    tags: ["reasoning", "code", "long-ctx", "fast"],
  },
  {
    id: "e2ee-gemma-3-27b-p",
    label: "Gemma 3 27B",
    family: "Gemma",
    contextK: 40,
    outPerMtok: 0.5,
    inPerMtok: 0.14,
    description: "Google's multimodal 27B — 140+ language understanding.",
    tags: ["vision"],
  },
  {
    id: "e2ee-gemma-4-31b",
    label: "Gemma 4 31B Instruct",
    family: "Gemma",
    contextK: 32,
    outPerMtok: 0.43,
    inPerMtok: 0.139,
    description: "Gemma 4 instruction-tuned dense model with reasoning.",
    tags: ["reasoning"],
  },
  {
    id: "e2ee-gpt-oss-20b-p",
    label: "GPT OSS 20B",
    family: "GPT-OSS",
    contextK: 128,
    outPerMtok: 0.19,
    inPerMtok: 0.05,
    description: "OpenAI's compact 21B MoE — 3.6B active, low-latency.",
    tags: ["reasoning", "fast"],
  },
  {
    id: "e2ee-qwen-2-5-7b-p",
    label: "Qwen 2.5 7B",
    family: "Qwen",
    contextK: 32,
    outPerMtok: 0.13,
    inPerMtok: 0.05,
    description: "Compact 7B — coding, math, 29+ languages. Quickest option.",
    tags: ["code", "fast"],
  },
];
