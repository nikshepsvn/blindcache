"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { mockScopes } from "@/lib/mockData";
import { Dropdown } from "@/components/Dropdown";
import { ModelPicker } from "@/components/ModelPicker";

function MemoryStatus({
  toolsAvailable,
  vaultPhase,
}: {
  toolsAvailable: boolean;
  vaultPhase: "loading" | "ready" | "error";
}) {
  let label: string;
  let color: string;
  let title: string;
  if (vaultPhase === "loading") {
    label = "memory: opening";
    color = "text-[var(--color-text-tertiary)]";
    title = "vault still opening";
  } else if (vaultPhase === "error") {
    label = "memory: error";
    color = "text-[var(--color-warn)]";
    title = "vault failed to open";
  } else if (!toolsAvailable) {
    label = "memory: read-only";
    color = "text-[var(--color-warn)]";
    title = "this model can't call tools — switch to a Qwen3 model to enable save/search";
  } else {
    label = "memory: tools on";
    color = "text-[var(--color-success)]";
    title = "save/search/list/delete memory tools available";
  }
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2 py-1 border border-[var(--color-border)] bg-[var(--color-input)] font-mono text-[10px] ${color}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

export function MessageInput({
  model,
  onModelChange,
  onSend,
  onStop,
  isStreaming,
  toolsAvailable,
  vaultPhase,
}: {
  model: string;
  onModelChange: (m: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  toolsAvailable: boolean;
  vaultPhase: "loading" | "ready" | "error";
}) {
  const [value, setValue] = useState("");
  const [scope, setScope] = useState("work");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = value.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => taRef.current?.focus());
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-elevated)]">
      <div className="max-w-[720px] mx-auto px-8 py-4">
        <div className="relative border border-[var(--color-border)] focus-within:border-[var(--color-accent-dim)] bg-[var(--color-input)] transition">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder="ask anything"
            rows={3}
            disabled={isStreaming}
            className="w-full bg-transparent px-4 py-3 pr-14 text-[14px] text-[var(--color-text-primary)] font-mono placeholder:text-[var(--color-text-tertiary)] resize-none focus:outline-none thin-scroll disabled:opacity-60"
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              className="absolute bottom-3 right-3 h-9 w-9 grid place-items-center bg-[var(--color-warn)] hover:opacity-90 text-[var(--color-base)] font-bold transition"
              aria-label="stop"
            >
              ◼
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!value.trim()}
              className="absolute bottom-3 right-3 h-9 w-9 grid place-items-center bg-[var(--color-accent)] hover:bg-[var(--color-accent-bright)] disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)] text-[var(--color-base)] font-bold transition"
              aria-label="send"
            >
              ↑
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-2.5 font-mono text-[10px] text-[var(--color-text-tertiary)]">
          <div className="flex items-center gap-2">
            <ModelPicker value={model} onChange={onModelChange} />
            <Dropdown
              label="scope"
              value={scope}
              onChange={setScope}
              width={180}
              options={mockScopes.map((s) => ({ value: s, label: s }))}
            />
            <MemoryStatus
              toolsAvailable={toolsAvailable}
              vaultPhase={vaultPhase}
            />
          </div>
          <div>
            {isStreaming ? "streaming · ⎋ to stop" : "⏎ send · ⇧⏎ newline"}
          </div>
        </div>
      </div>
    </div>
  );
}
