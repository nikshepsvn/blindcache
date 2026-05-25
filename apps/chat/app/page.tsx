"use client";

import { useState, useRef, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatThread } from "@/components/ChatThread";
import { MemoryPanel } from "@/components/MemoryPanel";
import { MessageInput } from "@/components/MessageInput";
import { OnboardingProvider } from "@/components/Onboarding";
import { seedMessages, type Message } from "@/lib/mockData";
import { streamVeniceChat, getVeniceKey, getVeniceModel } from "@/lib/venice";

const SYSTEM_PROMPT =
  "You are BlindChat — a private, terminal-styled assistant. Be concise and direct. Markdown bold is rendered with **double asterisks**.";

function shortTime(): string {
  return "just now";
}

export default function ChatPage() {
  const [hoveredIds, setHoveredIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [model, setModel] = useState(getVeniceModel());
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSend(text: string) {
    if (isStreaming) return;
    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: shortTime(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: shortTime(),
      streaming: true,
    };

    const next = [...messages, userMsg, assistantMsg];
    setMessages(next);
    setIsStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const apiKey = getVeniceKey();
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      for await (const chunk of streamVeniceChat({
        apiKey,
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        signal: ac.signal,
      })) {
        setMessages((curr) =>
          curr.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMessages((curr) =>
        curr.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content || `(error: ${msg})` }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      setMessages((curr) =>
        curr.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  // Global ⌘M / Ctrl+M to open the model picker is handled inside ModelPicker
  // via a click; this stub is here so future shortcuts have a place to land.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // future: open command palette
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="h-screen w-screen flex bg-[var(--color-base)] overflow-hidden">
      <OnboardingProvider />
      <Sidebar />

      <section className="flex-1 flex flex-col min-w-0">
        <ChatThread
          messages={messages}
          selectedMemoryIds={hoveredIds}
          onHoverMemoryIds={setHoveredIds}
        />
        {error && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-elevated)] px-8 py-2 font-mono text-[11px] text-[var(--color-warn)]">
            {error}
          </div>
        )}
        <MessageInput
          model={model}
          onModelChange={setModel}
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
        />
      </section>

      <MemoryPanel hoveredIds={hoveredIds} />
    </main>
  );
}
