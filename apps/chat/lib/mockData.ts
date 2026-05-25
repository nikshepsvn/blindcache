export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  injectedMemoryIds?: string[];
  streaming?: boolean;
  /** Tool calls the assistant made during this turn (memory ops). */
  toolEvents?: {
    name: string;
    summary: string; // human-readable: "saved memory", "searched 'X' → 3 hits"
    ok: boolean;
  }[];
};

export type Memory = {
  id: string;
  content: string;
  tags: string[];
  scope: string;
  source: string;
  timestamp: string;
  score?: number;
  pinned?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
};

export const mockThreads: ChatThread[] = [];

// Used by the MemoryPanel mock for now. v0.3 wires these to real BlindCache.
export const mockMemories: Memory[] = [
  {
    id: "m1",
    content: "Pair-programmed with Maya on the Stripe webhook retry logic — exponential backoff capped at 6 attempts.",
    tags: ["stripe", "webhooks", "maya"],
    scope: "work",
    source: "claude-code",
    timestamp: "2 days ago",
    pinned: true,
  },
  {
    id: "m2",
    content: "Rust async cancellation safety — Tokio's CancellationToken pattern. Pass the token down through every awaitable so cancellation propagates instead of hanging.",
    tags: ["rust", "tokio"],
    scope: "code",
    source: "cursor",
    timestamp: "3 days ago",
  },
  {
    id: "m3",
    content: "Q3 hiring plan needs 2 backend engineers and 1 designer.",
    tags: ["hiring", "q3"],
    scope: "work",
    source: "blindchat",
    timestamp: "5 days ago",
  },
  {
    id: "m4",
    content: "Listened to Lex Fridman × Yann LeCun on JEPA architectures.",
    tags: ["ai", "jepa"],
    scope: "learning",
    source: "blindchat",
    timestamp: "1 week ago",
  },
];

// Seed message — empty thread by default; user types to start.
export const seedMessages: Message[] = [];

export const mockScopes = ["default", "work", "personal", "code"];
