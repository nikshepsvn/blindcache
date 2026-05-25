"use client";

import { mockThreads, mockIdentity } from "@/lib/mockData";

export function Sidebar() {
  return (
    <aside className="w-[280px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-elevated)] flex flex-col">
      {/* Brand wordmark */}
      <div className="px-4 pt-5 pb-3 border-b border-[var(--color-border)] dither">
        <div className="font-[var(--font-display)] text-[26px] leading-none tracking-[0.06em] text-[var(--color-accent-bright)] glow flicker">
          BLINDCHAT
        </div>
        <div className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-[0.22em] mt-1.5">
          //&nbsp;v0.1 · MOCK
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 pt-3 pb-3 border-b border-[var(--color-border)]">
        <button className="group w-full flex items-center justify-between px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-dim)]/30 transition">
          <span className="font-mono text-[12px] text-[var(--color-accent-bright)] uppercase tracking-[0.14em]">
            [ + ] new chat
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)]">
            ⌘N
          </span>
        </button>
      </div>

      {/* Threads label */}
      <div className="px-4 pt-3 pb-1">
        <div className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-[0.2em] flex items-center gap-2">
          <span>RECENT</span>
          <span className="text-[var(--color-border-strong)] flex-1 overflow-hidden whitespace-nowrap">
            ━━━━━━━━━━━━━━━━━
          </span>
        </div>
      </div>

      {/* Threads */}
      <div className="flex-1 overflow-y-auto thin-scroll px-2 pb-3">
        {mockThreads.map((t, i) => {
          const active = i === 0;
          return (
            <button
              key={t.id}
              className={`w-full text-left px-3 py-2.5 border-l-2 mb-0.5 transition ${
                active
                  ? "bg-[var(--color-input)] border-l-[var(--color-accent)] text-[var(--color-text-primary)]"
                  : "bg-transparent border-l-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-input)]/40 hover:border-l-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-mono text-[10px] ${
                    active ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {active ? "▌" : "·"}
                </span>
                <div className="text-[12px] truncate font-mono leading-tight">
                  {t.title}
                </div>
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] truncate mt-1 leading-tight pl-3.5 font-mono">
                {t.preview}
              </div>
              <div className="text-[9px] text-[var(--color-text-tertiary)] font-mono mt-1 pl-3.5 uppercase tracking-[0.1em]">
                {t.updatedAt}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer: system status */}
      <div className="border-t border-[var(--color-border)] dither-strong">
        <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
          <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 bg-[var(--color-success)] glow-soft" />
              <span className="text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">
                VAULT
              </span>
            </div>
            <div className="text-[var(--color-success)] text-right tracking-[0.1em]">
              ONLINE
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 bg-[var(--color-success)] glow-soft" />
              <span className="text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">
                NODES
              </span>
            </div>
            <div className="text-[var(--color-accent-bright)] text-right tracking-[0.1em]">
              {mockIdentity.nodes}/{mockIdentity.nodes} ●●●●
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 bg-[var(--color-success)] glow-soft" />
              <span className="text-[var(--color-text-secondary)] uppercase tracking-[0.1em]">
                VENICE
              </span>
            </div>
            <div className="text-[var(--color-success)] text-right tracking-[0.1em]">
              TEE
            </div>
          </div>
        </div>
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="text-[9px] font-mono text-[var(--color-text-tertiary)] uppercase tracking-[0.1em]">
            DID
          </div>
          <button className="text-[10px] font-mono text-[var(--color-accent)] hover:text-[var(--color-accent-bright)] hover:glow-soft transition tracking-[0.05em]">
            zQ3sh…UczHe ⇲
          </button>
        </div>
        <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center justify-between">
          <button className="text-[10px] font-mono text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] uppercase tracking-[0.15em] transition">
            [ SETTINGS ]
          </button>
          <button className="text-[10px] font-mono text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] uppercase tracking-[0.15em] transition">
            [ DOCS ↗ ]
          </button>
        </div>
      </div>
    </aside>
  );
}
