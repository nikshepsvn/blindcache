// Client-side embedding for semantic search.
//
// Plaintext content never leaves the SDK process for embedding — the model
// runs locally via ONNX Runtime + WASM. Vectors are stored as plaintext
// arrays alongside encrypted content; cosine ranking happens client-side
// after fetch.
//
// Default model: Xenova/all-MiniLM-L6-v2 (q8 quantized, ~23MB, 384-dim).
// Loaded lazily on first use so vault.open() and read-only sessions stay
// fast.
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { EMBEDDING_DIM } from "./schema.js";

export type EmbedderConfig = {
  model?: string;
  dtype?: "fp32" | "fp16" | "q8" | "q4";
  enabled?: boolean;
};

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
const DEFAULT_DTYPE = "q8";

export class Embedder {
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

  constructor(private readonly config: EmbedderConfig = {}) {}

  /** Lazily loads the model on first call; subsequent calls reuse it. */
  private getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = pipeline(
        "feature-extraction",
        this.config.model ?? DEFAULT_MODEL,
        { dtype: this.config.dtype ?? DEFAULT_DTYPE }
      ) as Promise<FeatureExtractionPipeline>;
    }
    return this.pipelinePromise;
  }

  /** Pre-warm the model (optional — embed() will load on demand). */
  async warm(): Promise<void> {
    await this.getPipeline();
  }

  /** Embed a string into a 384-dim mean-pooled, L2-normalized vector. */
  async embed(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const out = await extractor(text.slice(0, 2000), {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(out.data as Float32Array);
  }
}

/** Cosine similarity assuming inputs are already L2-normalized (faster). */
export function cosineNormalized(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

/** Full cosine (in case caller stored un-normalized vectors). */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function isValidEmbedding(v: unknown): v is number[] {
  return Array.isArray(v) && v.length === EMBEDDING_DIM && v.every((n) => typeof n === "number");
}
