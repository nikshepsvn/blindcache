"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { VENICE_PRIVATE_MODELS, type VeniceModel } from "@/lib/venice";

export function ModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    VENICE_PRIVATE_MODELS.find((m) => m.id === value) ?? VENICE_PRIVATE_MODELS[0]!;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] text-[var(--color-text-primary)] hover:text-[var(--color-accent-bright)] border border-[var(--color-border)] hover:border-[var(--color-accent-dim)] bg-[var(--color-input)] transition"
        title="change model"
      >
        <span>{selected.label}</span>
        <span className="text-[9px] text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)]">
          {selected.contextK}k
        </span>
        <span className="ml-1 text-[8px] text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)]">
          ⌘M
        </span>
      </button>

      {open && (
        <ModelPickerModal
          value={value}
          onClose={() => setOpen(false)}
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function ModelPickerModal({
  value,
  onClose,
  onPick,
}: {
  value: string;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo<VeniceModel[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return VENICE_PRIVATE_MODELS;
    return VENICE_PRIVATE_MODELS.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.note ?? "").toLowerCase().includes(q)
    );
  }, [query]);

  const [activeIdx, setActiveIdx] = useState(() =>
    Math.max(0, filtered.findIndex((m) => m.id === value))
  );

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Global esc handler
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleKey(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const m = filtered[activeIdx];
      if (m) onPick(m.id);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(filtered.length - 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[12vh] bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[600px] max-w-[92vw] bg-[var(--color-panel)] border border-[var(--color-border-strong)] shadow-[0_24px_64px_rgba(0,0,0,0.7)] flex flex-col max-h-[70vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="font-mono text-[11px] text-[var(--color-accent-bright)] uppercase tracking-[0.2em] glow">
              select model
            </div>
            <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
              {filtered.length}/{VENICE_PRIVATE_MODELS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition px-1"
            aria-label="close"
          >
            esc ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-accent)] font-mono text-[12px]">
              ▸
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="filter by name, id, or note…"
              className="flex-1 bg-transparent font-mono text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto thin-scroll py-1">
          {filtered.length === 0 ? (
            <div className="px-5 py-6 text-center font-mono text-[12px] text-[var(--color-text-tertiary)]">
              no models match &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((m, i) => {
              const isSelected = m.id === value;
              const isActive = i === activeIdx;
              return (
                <button
                  key={m.id}
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => onPick(m.id)}
                  className={`w-full text-left px-5 py-2.5 flex items-center gap-3 transition ${
                    isActive
                      ? "bg-[var(--color-input)] border-l-2 border-l-[var(--color-accent)]"
                      : "bg-transparent border-l-2 border-l-transparent"
                  }`}
                >
                  <span
                    className={`w-3 shrink-0 font-mono text-[12px] text-[var(--color-accent)] ${
                      isSelected ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    ✓
                  </span>
                  <div className="flex-1 min-w-0 flex items-center gap-2.5">
                    <span
                      className={`font-mono text-[13px] truncate ${
                        isSelected
                          ? "text-[var(--color-accent-bright)]"
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {m.label}
                    </span>
                    {m.note && (
                      <span className="font-mono text-[10px] text-[var(--color-accent)] shrink-0 truncate">
                        {m.note}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-[10px] text-[var(--color-text-tertiary)]">
                    <span>{m.contextK}k ctx</span>
                    <span className="text-[var(--color-accent)] uppercase tracking-[0.08em]">
                      {m.privacy}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between font-mono text-[10px] text-[var(--color-text-tertiary)]">
          <div className="flex items-center gap-3">
            <span>↑↓ nav</span>
            <span>⏎ select</span>
            <span>esc close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-[var(--color-success)] rounded-full" />
            <span>all {VENICE_PRIVATE_MODELS.length} run in TEE + E2EE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
