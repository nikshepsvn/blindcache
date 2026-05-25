"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatThread } from "@/components/ChatThread";
import { MemoryPanel } from "@/components/MemoryPanel";
import { MessageInput } from "@/components/MessageInput";
import { OnboardingProvider } from "@/components/Onboarding";
import { seedMessages, type Message } from "@/lib/mockData";
import {
  streamVeniceTurn,
  getVeniceKey,
  getVeniceModel,
  findModel,
  type VeniceMessage,
} from "@/lib/venice";
import { MEMORY_TOOLS, executeMemoryTool } from "@/lib/memoryTools";
import { useVault } from "@/lib/useVault";

const SYSTEM_PROMPT_WITH_TOOLS = `You are BlindChat — a private, terminal-styled assistant. Be concise and direct. Markdown bold uses **double asterisks**.

You have four tools backed by an encrypted memory vault for this user:
- save_memory(content, tags?) — persist a durable fact (preferences, projects, decisions). NEVER reply "Saved." without actually invoking save_memory first — the call is what persists; text alone does nothing.
- search_memory(query, limit?) — look up prior context by meaning. Call whenever the user references something they may have told you before.
- list_recent_memories(limit?) — show the most recent N saved memories. Use when the user asks what you remember.
- delete_memory(id) — permanently remove a memory by id (get the id from search/list first). Use only when the user explicitly asks you to forget something.

Tool-use rules:
1. If the user asks to remember/save/note something, you MUST call save_memory.
2. If the user references past info, call search_memory first.
3. If the user asks what you know about them, call list_recent_memories.
4. Don't save every utterance — only durable facts.
5. After a tool call, briefly confirm in plain text (e.g., "Saved." / "Found 2: …").`;

const SYSTEM_PROMPT_NO_TOOLS = `You are BlindChat — a private, terminal-styled assistant. Be concise and direct. Markdown bold uses **double asterisks**.

NOTE: This model does not support tool-calling, so you cannot read or write the encrypted memory vault during this conversation. If the user asks to save or recall a memory, suggest they switch to a tool-capable model (e.g., Qwen3 30B A3B) via ⌘M.`;

const MAX_TOOL_ROUNDS = 5;
const PANEL_COLLAPSED_KEY = "bc_memory_panel_collapsed_v1";

function shortTime(): string {
  return "just now";
}

export default function ChatPage() {
  const [hoveredIds, setHoveredIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [model, setModel] = useState(getVeniceModel());
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { state: vaultState, memories, refresh, refreshing } = useVault();

  useEffect(() => {
    try {
      setPanelCollapsed(localStorage.getItem(PANEL_COLLAPSED_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);

  const togglePanel = useCallback(() => {
    setPanelCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(PANEL_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  async function handleSend(text: string) {
    if (isStreaming) return;
    setError(null);

    const modelMeta = findModel(model);
    const toolsAvailable =
      vaultState.phase === "ready" && (modelMeta?.supportsTools ?? false);

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
      toolEvents: [],
    };

    setMessages((curr) => [...curr, userMsg, assistantMsg]);
    setIsStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    const apiKey = (() => {
      try {
        return getVeniceKey();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      }
    })();
    if (!apiKey) {
      setIsStreaming(false);
      return;
    }

    const sysPrompt = toolsAvailable
      ? SYSTEM_PROMPT_WITH_TOOLS
      : SYSTEM_PROMPT_NO_TOOLS;
    const history: VeniceMessage[] = [
      { role: "system", content: sysPrompt },
      ...messages.map<VeniceMessage>((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: text },
    ];

    const referencedMemoryIds: string[] = [];
    let mutated = false;

    try {
      let round = 0;
      while (round < MAX_TOOL_ROUNDS) {
        round++;
        let turnContent = "";
        let toolCalls: { id: string; name: string; arguments: string }[] = [];

        for await (const ev of streamVeniceTurn({
          apiKey,
          model,
          messages: history,
          tools: toolsAvailable ? MEMORY_TOOLS : undefined,
          signal: ac.signal,
        })) {
          if (ev.kind === "content") {
            turnContent += ev.delta;
            setMessages((curr) =>
              curr.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + ev.delta }
                  : m
              )
            );
          } else {
            toolCalls = ev.toolCalls;
          }
        }

        if (toolCalls.length === 0) break;

        history.push({
          role: "assistant",
          content: turnContent.length > 0 ? turnContent : null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: tc.arguments },
          })),
        });

        for (const tc of toolCalls) {
          const result = await executeMemoryTool(tc.name, tc.arguments);
          history.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result.content,
          });
          const summary = summarizeToolCall(tc, result);
          setMessages((curr) =>
            curr.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    toolEvents: [
                      ...(m.toolEvents ?? []),
                      { name: tc.name, summary, ok: result.ok },
                    ],
                  }
                : m
            )
          );
          if (result.entries) {
            for (const e of result.entries) referencedMemoryIds.push(e.id);
          }
          if (result.mutated) mutated = true;
        }
      }
    } catch (e) {
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
        curr.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                streaming: false,
                injectedMemoryIds:
                  referencedMemoryIds.length > 0 ? referencedMemoryIds : undefined,
              }
            : m
        )
      );
      if (mutated || referencedMemoryIds.length > 0) {
        refresh().catch(() => {});
      }
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
      }
      // ⌘. toggles the memory panel.
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        togglePanel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePanel]);

  const lastInjected =
    [...messages].reverse().find((m) => m.injectedMemoryIds)?.injectedMemoryIds ??
    [];

  const modelMeta = findModel(model);
  const toolsAvailable =
    vaultState.phase === "ready" && (modelMeta?.supportsTools ?? false);

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
          toolsAvailable={toolsAvailable}
          vaultPhase={vaultState.phase}
        />
      </section>

      <MemoryPanel
        memories={memories}
        injectedIds={lastInjected}
        hoveredIds={hoveredIds}
        vaultState={vaultState}
        collapsed={panelCollapsed}
        onToggleCollapsed={togglePanel}
        onRefresh={refresh}
        refreshing={refreshing}
      />
    </main>
  );
}

function summarizeToolCall(
  tc: { name: string; arguments: string },
  result: { ok: boolean; content: string; entries?: { id: string }[] }
): string {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(tc.arguments || "{}");
  } catch {
    /* ignore */
  }
  if (tc.name === "save_memory") {
    const preview = String(args.content ?? "").slice(0, 50);
    return result.ok
      ? `saved · "${preview}${preview.length >= 50 ? "…" : ""}"`
      : `save failed`;
  }
  if (tc.name === "search_memory") {
    const q = String(args.query ?? "").slice(0, 40);
    const hits = result.entries?.length ?? 0;
    return `searched "${q}" · ${hits} hit${hits === 1 ? "" : "s"}`;
  }
  if (tc.name === "list_recent_memories") {
    const hits = result.entries?.length ?? 0;
    return `listed ${hits} recent`;
  }
  if (tc.name === "delete_memory") {
    const id = String(args.id ?? "").slice(0, 8);
    return result.ok ? `deleted id=${id}…` : `delete failed`;
  }
  return tc.name;
}
