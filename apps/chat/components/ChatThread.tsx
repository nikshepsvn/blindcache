"use client";

import { type Message } from "@/lib/mockData";

function formatContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong
          key={i}
          className="text-[var(--color-accent-bright)] font-medium"
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
      <div className="max-w-[720px] mx-auto px-8 py-10 space-y-7">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className="space-y-2">
              {/* Speaker line — minimal */}
              <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--color-text-tertiary)]">
                <span
                  className={
                    isUser
                      ? "text-[var(--color-text-secondary)]"
                      : "text-[var(--color-accent)]"
                  }
                >
                  {isUser ? "you" : "venice"}
                </span>
                {msg.injectedMemoryIds && msg.injectedMemoryIds.length > 0 && (
                  <button
                    onMouseEnter={() =>
                      onHoverMemoryIds(msg.injectedMemoryIds!)
                    }
                    onMouseLeave={() => onHoverMemoryIds([])}
                    className="hover:text-[var(--color-accent)] transition"
                  >
                    {msg.injectedMemoryIds.length === 1
                      ? "1 memory pulled"
                      : `${msg.injectedMemoryIds.length} memories pulled`}
                  </button>
                )}
                <span className="ml-auto">{msg.timestamp}</span>
              </div>

              {/* Content */}
              <div className="text-[14.5px] leading-[1.75] whitespace-pre-wrap font-mono text-[var(--color-text-primary)]">
                {formatContent(msg.content)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
