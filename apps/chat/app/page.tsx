"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatThread } from "@/components/ChatThread";
import { MemoryPanel } from "@/components/MemoryPanel";
import { MessageInput } from "@/components/MessageInput";
import { mockMessages } from "@/lib/mockData";

export default function ChatPage() {
  const [hoveredIds, setHoveredIds] = useState<string[]>([]);

  return (
    <main className="h-screen w-screen flex bg-[var(--color-base)] overflow-hidden">
      <Sidebar />

      <section className="flex-1 flex flex-col min-w-0">
        {/* Topbar — terminal-style header */}
        <header className="h-12 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-elevated)] flex items-center px-6 dither">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-[10px] text-[var(--color-accent-bright)] glow-soft uppercase tracking-[0.2em]">
              SESSION
            </span>
            <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
              ›
            </span>
            <div className="font-mono text-[13px] truncate text-[var(--color-text-primary)]">
              rust cancellation pattern + q3 plan
            </div>
            <span className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-[0.14em]">
              [scope: work] [4 turns] [3 mem injected]
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="font-mono text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-bright)] hover:glow-soft transition px-2.5 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent-dim)] uppercase tracking-[0.14em]">
              EXPORT ↓
            </button>
            <button className="font-mono text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-bright)] hover:glow-soft transition px-2.5 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent-dim)] uppercase tracking-[0.14em]">
              SHARE SCOPE
            </button>
            <button className="font-mono text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] transition px-2.5 py-1 border border-[var(--color-border)] hover:border-[var(--color-danger)] uppercase tracking-[0.14em]">
              FORGET
            </button>
          </div>
        </header>

        <ChatThread
          messages={mockMessages}
          selectedMemoryIds={hoveredIds}
          onHoverMemoryIds={setHoveredIds}
        />

        <MessageInput />
      </section>

      <MemoryPanel hoveredIds={hoveredIds} />
    </main>
  );
}
