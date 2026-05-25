"use client";

import { useState } from "react";
import { mockModels, mockScopes } from "@/lib/mockData";

export function MessageInput() {
  const [value, setValue] = useState("");
  const [model, setModel] = useState(mockModels[0]);
  const [scope, setScope] = useState("work");

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-elevated)]">
      <div className="dither-strong border-b border-[var(--color-border)]">
        <div className="max-w-[780px] mx-auto px-10 py-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
          <div className="text-[var(--color-text-tertiary)]">PROMPT BUS</div>
          <span className="text-[var(--color-text-tertiary)] flex-1 overflow-hidden whitespace-nowrap">
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          </span>
          <span className="text-[var(--color-accent-bright)] glow-soft">
            CLIENT-SIDE
          </span>
        </div>
      </div>

      <div className="max-w-[780px] mx-auto px-10 py-4">
        {/* Controls row */}
        <div className="flex items-center gap-2 mb-3 font-mono text-[10px] uppercase tracking-[0.14em]">
          <ChipSelect
            label="MODEL"
            value={model.id}
            onChange={(v) => {
              const m = mockModels.find((x) => x.id === v);
              if (m) setModel(m);
            }}
            options={mockModels.map((m) => ({
              value: m.id,
              label: `${m.label} · ${m.tier}`,
            }))}
          />
          <ChipSelect
            label="SCOPE"
            value={scope}
            onChange={setScope}
            options={mockScopes.map((s) => ({ value: s, label: s }))}
          />
          <button className="ml-auto px-2.5 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent-dim)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-bright)] hover:glow-soft transition">
            ⌘K
          </button>
        </div>

        {/* Textarea */}
        <div className="relative border border-[var(--color-border-strong)] focus-within:border-[var(--color-accent-bright)] focus-within:glow-box bg-[var(--color-input)] transition">
          {/* prompt prefix line */}
          <div className="absolute top-2 left-3 font-mono text-[12px] text-[var(--color-accent-bright)] pointer-events-none glow-soft">
            ▸
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ask anything · memory ranks before send"
            rows={3}
            className="w-full bg-transparent pl-8 pr-14 py-2.5 text-[13.5px] text-[var(--color-text-primary)] font-mono placeholder:text-[var(--color-text-tertiary)] resize-none focus:outline-none thin-scroll"
          />
          <button
            disabled={!value.trim()}
            className="absolute bottom-3 right-3 h-9 px-3 grid place-items-center bg-[var(--color-accent-bright)] hover:bg-[var(--color-accent-hot)] disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)] text-[var(--color-base)] font-mono font-bold text-[11px] uppercase tracking-[0.14em] transition glow-soft"
          >
            SEND ↑
          </button>
        </div>

        {/* Help row */}
        <div className="flex items-center justify-between mt-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          <div className="flex items-center gap-3">
            <span>⏎ SEND</span>
            <span>⇧⏎ NEWLINE</span>
            <span>/ COMMAND</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-1 bg-[var(--color-success)] glow-soft" />
            <span>EMBED LOCAL · TEE INFERENCE · MPC AT REST</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChipSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative flex items-center">
      <span className="text-[var(--color-text-tertiary)] mr-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-[var(--color-input)] border border-[var(--color-border)] px-2.5 py-1 pr-6 text-[var(--color-accent-bright)] hover:border-[var(--color-accent-dim)] cursor-pointer focus:outline-none focus:border-[var(--color-accent)] glow-soft"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[var(--color-base)]">
            {o.label}
          </option>
        ))}
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none text-[9px]">
        ▾
      </span>
    </div>
  );
}
