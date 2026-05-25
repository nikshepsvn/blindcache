"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const STORAGE_KEY = "bc_onboarding_seen_v1";

type Step = {
  num: string;
  eyebrow: string;
  title: string;
  image?: string; // public path to a banner image
  body: ReactNode;
};

export const OPEN_ONBOARDING_EVENT = "blindchat:open-onboarding";

export function OnboardingProvider() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  const steps: Step[] = [
    {
      num: "01 / 04",
      eyebrow: "welcome",
      title: "blindchat",
      image: "/onboarding/01-welcome.jpg",
      body: (
        <div className="space-y-3">
          <p className="font-mono text-[13.5px] leading-[1.65] text-[var(--color-text-primary)]">
            private chat with portable memory.
          </p>
          <p className="font-mono text-[12.5px] leading-[1.65] text-[var(--color-text-secondary)]">
            three layers stitched together: an LLM running in a hardware
            enclave, encrypted memory sharded across an independent network,
            and embeddings computed in your browser. no backend on our side —
            your browser is the whole app.
          </p>
        </div>
      ),
    },
    {
      num: "02 / 04",
      eyebrow: "the stack",
      title: "how privacy works",
      image: "/onboarding/02-stack.jpg",
      body: (
        <div className="space-y-2.5">
          <Layer
            tag="inference"
            where="Venice"
            detail="TEE-hosted models — your prompt is processed inside an enclave the provider can't read. no logs."
          />
          <Layer
            tag="memory"
            where="BlindCache · Nillion"
            detail="content split into Shamir shares across 4 mainnet operators on 3 continents. they would have to collude to decrypt."
          />
          <Layer
            tag="embeddings"
            where="local · in-browser"
            detail="Xenova all-MiniLM-L6-v2 runs in your tab via Transformers.js. your text never leaves the SDK to be embedded."
          />
        </div>
      ),
    },
    {
      num: "03 / 04",
      eyebrow: "honest",
      title: "what's not perfectly private",
      image: "/onboarding/03-honest.jpg",
      body: (
        <ul className="font-mono text-[12px] leading-[1.65] text-[var(--color-text-secondary)] space-y-2.5">
          <li>
            <span className="text-[var(--color-warn)]">·</span>{" "}
            <b className="text-[var(--color-text-primary)]">metadata is plaintext</b>{" "}
            — tags, scope, and timestamps need to be queryable, so they sit on
            each nilDB node un-sharded. any single node operator can read
            them.
          </li>
          <li>
            <span className="text-[var(--color-warn)]">·</span>{" "}
            <b className="text-[var(--color-text-primary)]">browser RAM</b> —
            what you type lives in your tab&apos;s memory until you close it.
          </li>
          <li>
            <span className="text-[var(--color-warn)]">·</span>{" "}
            <b className="text-[var(--color-text-primary)]">this page is the attack surface</b>{" "}
            — a compromised browser, malicious extension, or hijacked domain
            can read everything you do here.
          </li>
        </ul>
      ),
    },
    {
      num: "04 / 04",
      eyebrow: "your keys",
      title: "you hold them",
      image: "/onboarding/04-keys.jpg",
      body: (
        <div className="space-y-3">
          <p className="font-mono text-[12.5px] leading-[1.65] text-[var(--color-text-secondary)]">
            two keys do all the work: a Venice API key (TEE access) and a
            Nillion private key (vault identity). in this build they live in{" "}
            <span className="text-[var(--color-accent)]">.env.local</span>. in
            production they&apos;ll live in IndexedDB encrypted behind a
            passkey — and neither ever crosses our wire.
          </p>
          <div className="font-mono text-[11px] text-[var(--color-text-tertiary)] pt-2 border-t border-[var(--color-border)] flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 bg-[var(--color-success)] rounded-full" />
            <span>all keys client-side · no accounts · no telemetry</span>
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
    // Allow external triggers (e.g., sidebar "intro" link) to re-open the
    // modal regardless of localStorage state.
    function onOpen() {
      setIdx(0);
      setOpen(true);
    }
    window.addEventListener(OPEN_ONBOARDING_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, onOpen);
  }, []);

  // Keep step length in a ref so the once-registered listener uses fresh data.
  const stepCountRef = useRef(steps.length);
  stepCountRef.current = steps.length;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* private mode etc */
    }
    setOpen(false);
  }
  function next() {
    setIdx((i) => {
      if (i < stepCountRef.current - 1) return i + 1;
      dismiss();
      return i;
    });
  }
  function back() {
    setIdx((i) => Math.max(0, i - 1));
  }

  // Single listener that survives idx changes — avoids React 19 StrictMode
  // double-registration causing one Enter to advance two steps.
  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const step = steps[idx]!;
  const isLast = idx === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[600px] h-[560px] max-w-[94vw] max-h-[94vh] bg-[var(--color-panel)] border border-[var(--color-border-strong)] shadow-[0_24px_72px_rgba(0,0,0,0.8)] flex flex-col"
      >
        {/* Top bar: progress + skip */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`go to step ${i + 1}`}
                className={`h-1.5 w-6 transition ${
                  i === idx
                    ? "bg-[var(--color-accent)]"
                    : i < idx
                    ? "bg-[var(--color-accent-dim)]"
                    : "bg-[var(--color-border)] hover:bg-[var(--color-border-strong)]"
                }`}
              />
            ))}
            <span className="font-mono text-[10px] text-[var(--color-text-tertiary)] ml-2">
              {step.num}
            </span>
          </div>
          <button
            onClick={dismiss}
            className="font-mono text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition"
          >
            skip
          </button>
        </div>

        {/* Banner image — fixed slot */}
        <div className="px-6 pb-3 shrink-0">
          <div className="relative w-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-base)]" style={{ aspectRatio: "4 / 1" }}>
            {step.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={step.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
        </div>

        {/* Body — fills remaining space, scrolls only if needed */}
        <div className="px-7 pt-2 pb-5 flex-1 overflow-y-auto thin-scroll min-h-0">
          <div className="font-mono text-[10px] text-[var(--color-accent)] uppercase tracking-[0.22em] mb-1.5">
            {step.eyebrow}
          </div>
          <h2 className="font-mono text-[18px] font-medium text-[var(--color-text-primary)] mb-3.5">
            {step.title}
          </h2>
          {step.body}
        </div>

        {/* Footer: back / continue */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={back}
            disabled={idx === 0}
            className="font-mono text-[11px] px-3 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:text-[var(--color-text-faint)] disabled:cursor-not-allowed transition"
          >
            ← back
          </button>
          <div className="font-mono text-[10px] text-[var(--color-text-tertiary)] flex-1 text-center">
            ← → step · ⏎ next · esc skip
          </div>
          <button
            onClick={next}
            className="font-mono text-[11px] uppercase tracking-[0.16em] px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-bright)] text-[var(--color-base)] font-medium transition"
          >
            {isLast ? "start →" : "continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Layer({
  tag,
  where,
  detail,
}: {
  tag: string;
  where: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-[var(--color-accent-dim)] pl-3 py-1">
      <div className="shrink-0 w-[105px]">
        <div className="font-mono text-[10px] text-[var(--color-accent)] uppercase tracking-[0.14em]">
          {tag}
        </div>
        <div className="font-mono text-[9.5px] text-[var(--color-text-tertiary)] mt-0.5">
          {where}
        </div>
      </div>
      <div className="font-mono text-[11.5px] text-[var(--color-text-secondary)] leading-[1.55] flex-1">
        {detail}
      </div>
    </div>
  );
}
