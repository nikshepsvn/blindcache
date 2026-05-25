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

  return (
    <aside className="w-[340px] shrink-0 border-l border-[var(--color-border)] bg-[var(--color-elevated)] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-[var(--color-border)] dither">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-accent-bright)] glow-soft">
            // MEMORY
          </div>
          <div className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-[0.1em]">
            {mockMemories.length} ENTRIES
          </div>
        </div>
        <div className="flex gap-0 -mb-3">
          <button
            onClick={() => setTab("injected")}
            className={`flex-1 text-[10px] font-mono py-1.5 uppercase tracking-[0.16em] border-b-2 transition ${
              tab === "injected"
                ? "border-[var(--color-accent-bright)] text-[var(--color-text-primary)] glow-soft"
                : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            INJECTED ({injected.length})
          </button>
          <button
            onClick={() => setTab("all")}
            className={`flex-1 text-[10px] font-mono py-1.5 uppercase tracking-[0.16em] border-b-2 transition ${
              tab === "all"
                ? "border-[var(--color-accent-bright)] text-[var(--color-text-primary)] glow-soft"
                : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            ALL
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto thin-scroll p-3 space-y-2">
        {tab === "injected" ? (
          <>
            <div className="px-1 py-2">
              <div className="font-mono text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-[0.2em]">
                {">"} PULLED FOR CURRENT TURN
              </div>
              <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1 font-mono">
                {hoveredIds.length > 0
                  ? "highlighted from chat hover"
                  : "top cosine for the most recent reply"}
              </div>
            </div>
            {injected.map((m) => (
              <MemoryCard key={m.id} memory={m} highlight />
            ))}
            <div className="px-1 py-3 mt-3 border-t border-[var(--color-border)]">
              <div className="font-mono text-[9px] text-[var(--color-warn)] uppercase tracking-[0.2em] mb-2">
                ⚠ PRIVACY TRACE
              </div>
              <div className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed font-mono">
                memories embedded locally via{" "}
                <span className="text-[var(--color-accent-bright)]">
                  MiniLM-L6-v2
                </span>
                . only injected text + your prompt sent to{" "}
                <span className="text-[var(--color-accent-bright)]">
                  Venice TEE
                </span>
                .
              </div>
            </div>
          </>
        ) : (
          mockMemories.map((m) => <MemoryCard key={m.id} memory={m} />)
        )}
      </div>

      {/* Footer: stack */}
      <div className="border-t border-[var(--color-border)] dither-strong">
        <div className="px-4 py-3">
          <div className="font-mono text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-[0.22em] mb-2">
            STACK
          </div>
          <div className="space-y-1 text-[10px] font-mono">
            <StackRow label="VENICE" status="LIVE" color="success" />
            <StackRow label="NILDB.MAINNET" status="4/4" color="success" />
            <StackRow label="BLINDFOLD" status="OK" color="success" />
            <StackRow label="TRANSFORMERS.JS" status="LOADED" color="success" />
            <StackRow label="NILAI" status="—" color="muted" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function StackRow({
  label,
  status,
  color,
}: {
  label: string;
  status: string;
  color: "success" | "muted";
}) {
  const dotColor =
    color === "success"
      ? "bg-[var(--color-success)]"
      : "bg-[var(--color-text-tertiary)]";
  const textColor =
    color === "success"
      ? "text-[var(--color-success)]"
      : "text-[var(--color-text-tertiary)]";
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-1.5 w-1.5 ${dotColor} glow-soft`} />
        <span className="text-[var(--color-text-secondary)] tracking-[0.1em]">
          {label}
        </span>
      </div>
      <span className={`${textColor} tracking-[0.1em]`}>{status}</span>
    </div>
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
      className={`px-3 py-2.5 border transition group relative ${
        highlight
          ? "bg-[var(--color-input)] border-[var(--color-accent-dim)] glow-box"
          : "bg-[var(--color-base)]/40 border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      {/* Top meta */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
          {memory.pinned && (
            <span className="text-[var(--color-warn)] glow-soft">★</span>
          )}
          <span className="text-[var(--color-accent)]">[{memory.scope}]</span>
          <span>·</span>
          <span>{memory.source}</span>
        </div>
        {memory.score !== undefined && (
          <span className="font-mono text-[10px] text-[var(--color-accent-bright)] glow-soft shrink-0 tracking-[0.05em]">
            ◉ {memory.score.toFixed(2)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="text-[12px] leading-snug text-[var(--color-text-primary)] font-mono line-clamp-3 mb-2">
        {memory.content}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-1.5">
        {memory.tags.slice(0, 4).map((t) => (
          <span
            key={t}
            className="font-mono text-[9px] text-[var(--color-text-secondary)] px-1.5 py-px bg-[var(--color-base)]/80 border border-[var(--color-border)] uppercase tracking-[0.08em]"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="font-mono text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-[0.1em]">
        {memory.timestamp}
      </div>
    </div>
  );
}
