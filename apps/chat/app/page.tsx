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
