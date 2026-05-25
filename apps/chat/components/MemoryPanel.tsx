"use client";

import { useState } from "react";
import { mockMemories } from "@/lib/mockData";

export function MemoryPanel({ hoveredIds }: { hoveredIds: string[] }) {
  const [tab, setTab] = useState<"injected" | "all">("injected");

  const injectedIds = hoveredIds.length > 0 ? hoveredIds : ["m3"];
  const injected = mockMemories
    .filter((m) => injectedIds.includes(m.id))
    .map((m, i) => ({
      ...m,
      score: hoveredIds.length === 0 ? 0.81 : [0.84, 0.79, 0.73][i] ?? 0.7,
    }));

  const list = tab === "injected" ? injected : mockMemories;

  return (
    <aside className="w-[320px] shrink-0 border-l border-[var(--color-border)] bg-[var(--color-elevated)] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[12px] text-[var(--color-text-secondary)]">
            memory
          </div>
          <div className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
            {mockMemories.length} total
          </div>
        </div>
        <div className="flex gap-4 font-mono text-[11px]">
          <button
            onClick={() => setTab("injected")}
            className={`pb-2 border-b transition ${
              tab === "injected"
                ? "text-[var(--color-text-primary)] border-[var(--color-accent)]"
                : "text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-secondary)]"
            }`}
          >
            injected
          </button>
          <button
            onClick={() => setTab("all")}
            className={`pb-2 border-b transition ${
              tab === "all"
                ? "text-[var(--color-text-primary)] border-[var(--color-accent)]"
                : "text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-secondary)]"
            }`}
          >
            all
          </button>
          <div className="flex-1 border-b border-[var(--color-border)] pb-2" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto thin-scroll p-3 space-y-1.5">
        {list.map((m) => (
          <MemoryCard
            key={m.id}
            memory={m}
            highlight={tab === "injected"}
          />
        ))}
      </div>

      {/* Footer: single line */}
      <div className="border-t border-[var(--color-border)] px-5 py-3 font-mono text-[10px] text-[var(--color-text-tertiary)] flex items-center justify-between">
        <span>embed local · TEE inference · MPC at rest</span>
        <span title="all systems online" className="h-1.5 w-1.5 bg-[var(--color-success)] rounded-full" />
      </div>
    </aside>
  );
}

function MemoryCard({
  memory,
  highlight,
}: {
  memory: (typeof mockMemories)[0] & { score?: number };
  highlight?: boolean;
}) {
  return (
    <div
      className={`px-3 py-2.5 border transition ${
        highlight
          ? "bg-[var(--color-input)] border-[var(--color-accent-dim)]"
          : "border-transparent hover:bg-[var(--color-input)]/40 hover:border-[var(--color-border)]"
      }`}
    >
      {/* Content */}
      <div className="text-[12px] leading-snug text-[var(--color-text-primary)] font-mono line-clamp-3 mb-2">
        {memory.content}
      </div>

      {/* Meta line */}
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--color-text-tertiary)]">
        <div className="flex items-center gap-2 truncate">
          {memory.pinned && <span className="text-[var(--color-warn)]">★</span>}
          <span>{memory.scope}</span>
          <span className="opacity-50">·</span>
          <span className="truncate">{memory.timestamp}</span>
        </div>
        {memory.score !== undefined && (
          <span className="text-[var(--color-accent)] shrink-0">
            {memory.score.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
