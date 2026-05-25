"use client";

import { useState } from "react";
import { mockModels, mockScopes } from "@/lib/mockData";

export function MessageInput() {
  const [value, setValue] = useState("");
  const [model, setModel] = useState(mockModels[0]);
  const [scope, setScope] = useState("work");

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-elevated)]">
      <div className="max-w-[720px] mx-auto px-8 py-4">
        {/* Textarea */}
        <div className="relative border border-[var(--color-border)] focus-within:border-[var(--color-accent-dim)] bg-[var(--color-input)] transition">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ask anything"
            rows={3}
            className="w-full bg-transparent px-4 py-3 pr-14 text-[14px] text-[var(--color-text-primary)] font-mono placeholder:text-[var(--color-text-tertiary)] resize-none focus:outline-none thin-scroll"
          />
          <button
            disabled={!value.trim()}
            className="absolute bottom-3 right-3 h-9 w-9 grid place-items-center bg-[var(--color-accent)] hover:bg-[var(--color-accent-bright)] disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)] text-[var(--color-base)] font-bold transition"
            aria-label="send"
          >
            ↑
          </button>
        </div>

        {/* Quiet meta row */}
        <div className="flex items-center justify-between mt-2.5 font-mono text-[10px] text-[var(--color-text-tertiary)]">
          <div className="flex items-center gap-3">
            <ChipSelect
              value={model.id}
              onChange={(v) => {
                const m = mockModels.find((x) => x.id === v);
                if (m) setModel(m);
              }}
              options={mockModels.map((m) => ({
                value: m.id,
                label: m.label,
              }))}
            />
            <ChipSelect
              value={scope}
              onChange={setScope}
              options={mockScopes.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="text-[var(--color-text-tertiary)]">
            ⏎ send · ⇧⏎ newline
          </div>
        </div>
      </div>
    </div>
  );
}

function ChipSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-transparent border-0 text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] cursor-pointer focus:outline-none font-mono"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[var(--color-base)]">
          {o.label}
        </option>
      ))}
    </select>
  );
}
