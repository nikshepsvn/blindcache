"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { mockScopes } from "@/lib/mockData";
import { Dropdown } from "@/components/Dropdown";
import { ModelPicker } from "@/components/ModelPicker";

export function MessageInput({
  model,
  onModelChange,
  onSend,
  onStop,
  isStreaming,
}: {
  model: string;
  onModelChange: (m: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
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
          </div>
          <div>
            {isStreaming ? "streaming · ⎋ to stop" : "⏎ send · ⇧⏎ newline"}
          </div>
        </div>
      </div>
    </div>
  );
}
