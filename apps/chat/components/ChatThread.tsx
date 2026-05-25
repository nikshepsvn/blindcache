"use client";

import { type Message } from "@/lib/mockData";

function formatContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong
          key={i}
          className="text-[var(--color-accent-bright)] font-semibold glow-soft"
        >
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function ChatThread({
  messages,
  onHoverMemoryIds,
}: {
  messages: Message[];
  selectedMemoryIds: string[];
  onHoverMemoryIds: (ids: string[]) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto thin-scroll">
      <div className="max-w-[780px] mx-auto px-10 py-10 space-y-8">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const label = isUser ? "USER" : "VENICE";
          const labelColor = isUser
            ? "text-[var(--color-text-tertiary)]"
            : "text-[var(--color-accent-bright)] glow-soft";

          return (
            <div key={msg.id} className="space-y-2">
              {/* Speaker line */}
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
                <span className={labelColor}>
                  {isUser ? "▸ " : "◂ "}
                  {label}
                </span>
                {msg.injectedMemoryIds && msg.injectedMemoryIds.length > 0 && (
                  <button
                    onMouseEnter={() =>
                      onHoverMemoryIds(msg.injectedMemoryIds!)
                    }
                    onMouseLeave={() => onHoverMemoryIds([])}
                    className="text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition border-l border-[var(--color-border)] pl-3"
                  >
                    [ PULLED {msg.injectedMemoryIds.length} MEM →
                  </button>
                )}
                <span className="text-[var(--color-text-tertiary)] flex-1 overflow-hidden whitespace-nowrap">
                  ──────────────────────────────────
                </span>
                <span className="text-[var(--color-text-tertiary)]">
                  {msg.timestamp}
                </span>
              </div>

              {/* Content */}
              <div
                className={`text-[14.5px] leading-[1.75] whitespace-pre-wrap font-mono ${
                  isUser
                    ? "text-[var(--color-text-primary)] pl-4 border-l border-[var(--color-border-strong)]"
                    : "text-[var(--color-text-primary)] pl-4 border-l border-[var(--color-accent-dim)]"
                }`}
              >
                {formatContent(msg.content)}
              </div>
            </div>
          );
        })}

        {/* Streaming indicator */}
        <div className="space-y-2 opacity-60">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
            <span className="text-[var(--color-accent-bright)] glow-soft">
              ◂ VENICE
            </span>
            <span className="text-[var(--color-text-tertiary)] flex-1 overflow-hidden whitespace-nowrap">
              ──────────────────────────────────
            </span>
            <span className="text-[var(--color-success)]">STREAMING</span>
          </div>
          <div className="pl-4 border-l border-[var(--color-accent-dim)] py-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-[var(--color-accent-bright)] glow-soft pulse-dot" />
            <span className="h-1.5 w-1.5 bg-[var(--color-accent-bright)] glow-soft pulse-dot pulse-dot-2" />
            <span className="h-1.5 w-1.5 bg-[var(--color-accent-bright)] glow-soft pulse-dot pulse-dot-3" />
            <span className="ml-2 font-mono text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-[0.1em]">
              awaiting tokens · TEE inference
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
