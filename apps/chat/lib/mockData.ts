export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  injectedMemoryIds?: string[]; // memories pulled in to answer this turn
};

export type Memory = {
  id: string;
  content: string;
  tags: string[];
  scope: string;
  source: string;
  timestamp: string;
  score?: number; // relevance score when injected
  pinned?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unread?: boolean;
};

// ── mock data ───────────────────────────────────────────────────────────────

export const mockThreads: ChatThread[] = [
  {
    id: "t1",
    title: "rust cancellation pattern + q3 plan",
    preview: "She was talking about Tokio's CancellationToken pattern…",
    updatedAt: "just now",
    unread: false,
  },
  {
    id: "t2",
    title: "stripe webhook retries",
    preview: "exponential backoff capped at 6 attempts — confirmed",
    updatedAt: "2h ago",
  },
  {
    id: "t3",
    title: "espresso machine descaling",
    preview: "every 60 cups apparently",
    updatedAt: "yesterday",
  },
  {
    id: "t4",
    title: "JEPA architecture notes",
    preview: "from the lex × yann lecun episode",
    updatedAt: "3d ago",
  },
];

export const mockMemories: Memory[] = [
  {
    id: "m1",
    content: "Pair-programmed with Maya on the Stripe webhook retry logic — exponential backoff capped at 6 attempts.",
    tags: ["stripe", "webhooks", "maya", "retry-logic"],
    scope: "work",
    source: "claude-code",
    timestamp: "2 days ago",
    pinned: true,
  },
  {
    id: "m2",
    content: "Rust async cancellation safety — Tokio's CancellationToken pattern. The key insight: passing the token down through every awaitable so cancellation propagates instead of hanging.",
    tags: ["rust", "tokio", "async", "cancellation"],
    scope: "code",
    source: "cursor",
    timestamp: "3 days ago",
  },
  {
    id: "m3",
    content: "Q3 hiring plan needs 2 backend engineers and 1 designer. Maya has the JD draft for the senior backend role.",
    tags: ["hiring", "q3", "team", "maya"],
    scope: "work",
    source: "blindchat",
    timestamp: "5 days ago",
  },
  {
    id: "m4",
    content: "Listened to Lex Fridman × Yann LeCun on JEPA architectures. Key concept: joint-embedding predictive architecture, learns abstract representations without generative reconstruction.",
    tags: ["ai", "jepa", "lecun", "podcast"],
    scope: "learning",
    source: "blindchat",
    timestamp: "1 week ago",
  },
  {
    id: "m5",
    content: "Espresso machine descaling — every 60 cups apparently. Use the citric acid solution, not vinegar.",
    tags: ["espresso", "maintenance"],
    scope: "personal",
    source: "blindchat",
    timestamp: "1 week ago",
  },
  {
    id: "m6",
    content: "Followup with Devon next week re: the partner agreement draft.",
    tags: ["devon", "partner-agreement", "followup"],
    scope: "work",
    source: "blindchat",
    timestamp: "1 week ago",
  },
];

export const mockMessages: Message[] = [
  {
    id: "msg1",
    role: "user",
    content: "what was that rust pattern maya mentioned for cancellation safety? i forget the name",
    timestamp: "just now",
  },
  {
    id: "msg2",
    role: "assistant",
    content:
      "Tokio's **CancellationToken** pattern. The key insight from your notes: pass the token down through every awaitable so cancellation propagates cleanly instead of leaving tasks hanging. \n\nMaya specifically pointed at it during the Stripe webhook retry work — the retry loop needed to bail cleanly if the upstream request was cancelled mid-backoff.",
    timestamp: "just now",
    injectedMemoryIds: ["m2", "m1"],
  },
  {
    id: "msg3",
    role: "user",
    content: "right. and what was the q3 hiring count again?",
    timestamp: "just now",
  },
  {
    id: "msg4",
    role: "assistant",
    content:
      "2 backend engineers and 1 designer. Maya has the JD draft for the senior backend role.",
    timestamp: "just now",
    injectedMemoryIds: ["m3"],
  },
];

export const mockIdentity = {
  did: "did:key:zQ3shr9j3okZ8VhQHxddUYrq6TAG3jND6V2FCzLG66mfUczHe",
  shortDid: "did:key:zQ3sh…UczHe",
  vault: "5f5e31dc-bd0c-4d71-ae83-5c0898a58166",
  model: "venice-uncensored",
  nodes: 4,
};

export const mockModels = [
  { id: "venice-uncensored", label: "venice-uncensored", tier: "S" },
  { id: "qwen3-235b-a22b-instruct-2507", label: "qwen3-235b", tier: "L" },
  { id: "deepseek-ai-DeepSeek-R1", label: "deepseek-r1", tier: "L" },
  { id: "mistral-31-24b", label: "mistral-31-24b", tier: "S" },
];

export const mockScopes = ["work", "personal", "code", "learning", "default"];
