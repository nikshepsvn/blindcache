"use client";

import { mockThreads } from "@/lib/mockData";

export function Sidebar() {
  return (
    <aside className="w-[260px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-elevated)] flex flex-col">
      {/* Brand */}
      <div className="px-5 pt-5 pb-5">
        <div className="font-[var(--font-display)] text-[22px] leading-none tracking-[0.04em] text-[var(--color-accent-bright)] glow">
          blindchat
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 pb-3">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-bright)] hover:bg-[var(--color-input)] border border-[var(--color-border)] hover:border-[var(--color-accent-dim)] transition">
          <span className="text-[var(--color-accent)]">+</span>
          <span>new chat</span>
          <span className="ml-auto text-[10px] text-[var(--color-text-tertiary)]">⌘N</span>
        </button>
      </div>

      {/* Threads */}
      <div className="flex-1 overflow-y-auto thin-scroll px-2 pb-3">
        {mockThreads.map((t, i) => {
          const active = i === 0;
          return (
            <button
              key={t.id}
              className={`w-full text-left px-3 py-2.5 mb-0.5 transition border-l-2 ${
                active
                  ? "bg-[var(--color-input)] border-l-[var(--color-accent)]"
                  : "border-l-transparent hover:bg-[var(--color-input)]/40"
              }`}
            >
              <div
                className={`text-[12px] truncate font-mono leading-tight ${
                  active
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {t.title}
              </div>
              <div className="text-[10px] text-[var(--color-text-tertiary)] truncate mt-1 leading-tight font-mono">
                {t.preview}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer: single muted status line */}
      <div className="border-t border-[var(--color-border)] px-4 py-3 flex items-center justify-between text-[11px] font-mono text-[var(--color-text-tertiary)]">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 bg-[var(--color-success)] rounded-full" />
          <span>vault online</span>
        </div>
        <button className="hover:text-[var(--color-accent)] transition">
          settings
        </button>
      </div>
    </aside>
  );
}
