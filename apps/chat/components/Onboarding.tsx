"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const STORAGE_KEY = "bc_onboarding_seen_v1";

type Step = {
  num: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  image?: string;
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
      title: "chat nothing reads.",
      subtitle:
        "the whole app runs in your browser. no backend on our side, no provider who can read your prompts or your memory.",
      image: "/onboarding/01-welcome.jpg",
      body: (
        <div className="space-y-2 mt-3">
          <Row
            num="01"
            tag="inference"
            where="venice · TEE"
            detail="prompts processed inside a hardware enclave the provider can't read."
          />
          <Row
            num="02"
            tag="memory"
            where="blindcache · nillion"
            detail="content secret-shared across 4 operators on 3 continents."
          />
          <Row
            num="03"
            tag="embeddings"
            where="local · transformers.js"
            detail="your text never leaves the SDK to be embedded."
          />
        </div>
      ),
    },
    {
      num: "02 / 04",
      eyebrow: "the stack",
      title: "how privacy actually works",
      subtitle: "three independent privacy primitives, stitched together.",
      image: "/onboarding/02-stack.jpg",
      body: (
        <div className="space-y-2 mt-3">
          <Row
            tag="inference"
            where="venice"
            detail="LLM runs inside a Trusted Execution Environment. the GPU operator can't see your prompt; nillion verifies it via remote attestation."
          />
          <Row
            tag="memory"
            where="blindcache"
            detail="content split into Shamir shares across nilDB nodes. operators would have to collude to decrypt — and they sit in different jurisdictions."
          />
          <Row
            tag="embeddings"
            where="in-browser"
            detail="Xenova all-MiniLM-L6-v2 runs in your tab via Transformers.js. semantic search happens before anything leaves your machine."
          />
        </div>
      ),
    },
    {
      num: "03 / 04",
      eyebrow: "honest",
      title: "what we don't defend against",
      subtitle:
        "no privacy claim is unconditional. the three real footnotes:",
      image: "/onboarding/03-honest.jpg",
      body: (
        <div className="space-y-2 mt-3">
          <Row
            variant="warn"
            num="!"
            tag="metadata"
            where="single node"
            detail="tags, scope, timestamps live as plaintext (so they're queryable). any one nilDB operator can see semantic clusters."
          />
          <Row
            variant="warn"
            num="!"
            tag="browser ram"
            where="your tab"
            detail="anything you type lives in your tab's memory until you close it. memory exfil via tab dumps is possible."
          />
          <Row
            variant="warn"
            num="!"
            tag="this page"
            where="attack surface"
            detail="a malicious extension, compromised browser, or hijacked domain can read everything you do on this site."
          />
        </div>
      ),
    },
    {
      num: "04 / 04",
      eyebrow: "your keys",
      title: "you hold them.",
      subtitle:
        "two keys do all the work — and neither ever crosses our wire.",
      image: "/onboarding/04-keys.jpg",
      body: (
        <div className="space-y-2 mt-3">
          <Row
            num="01"
            tag="venice key"
            where="TEE access"
            detail="bearer token to your provider's enclave. talks to Venice directly from your tab."
          />
          <Row
            num="02"
            tag="nillion key"
            where="vault identity"
            detail="signs NUC tokens for your nilDB shards. your DID is derived from it."
          />
          <div className="flex items-center gap-2 pt-3 mt-1 border-t border-[var(--color-border)] font-mono text-[10.5px] text-[var(--color-text-tertiary)]">
            <span className="inline-block h-1.5 w-1.5 bg-[var(--color-success)] rounded-full" />
            <span>
              client-side only · no accounts · no telemetry · production keys
              live in IndexedDB behind a passkey
            </span>
          </div>
        </div>
      ),
    },
  ];

  const stepCountRef = useRef(steps.length);
  stepCountRef.current = steps.length;

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
    function onOpen() {
      setIdx(0);
      setOpen(true);
    }
    window.addEventListener(OPEN_ONBOARDING_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, onOpen);
  }, []);

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
        className="w-[620px] h-[600px] max-w-[94vw] max-h-[94vh] bg-[var(--color-panel)] border border-[var(--color-border-strong)] shadow-[0_24px_72px_rgba(0,0,0,0.8)] flex flex-col"
      >
        {/* Top bar */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`step ${i + 1}`}
                className={`h-1 w-7 transition ${
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

        {/* Banner */}
        <div className="px-6 pb-3 shrink-0">
          <div
            className="relative w-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-base)]"
            style={{ aspectRatio: "4 / 1" }}
          >
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

        {/* Body */}
        <div className="px-7 pt-1 pb-4 flex-1 overflow-y-auto thin-scroll min-h-0">
          <div className="font-mono text-[10px] text-[var(--color-accent)] uppercase tracking-[0.22em] mb-1.5">
            {step.eyebrow}
          </div>
          <h2 className="font-mono text-[18px] font-medium text-[var(--color-text-primary)] mb-2 leading-snug">
            {step.title}
          </h2>
          {step.subtitle && (
            <p className="font-mono text-[12px] leading-[1.55] text-[var(--color-text-secondary)] mb-1">
              {step.subtitle}
            </p>
          )}
          {step.body}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={back}
            disabled={idx === 0}
            className="font-mono text-[11px] px-2 py-1 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:text-[var(--color-text-faint)] disabled:cursor-not-allowed transition"
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
            {isLast ? "enter →" : "continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  num,
  tag,
  where,
  detail,
  variant = "default",
}: {
  num?: string;
  tag: string;
  where: string;
  detail: string;
  variant?: "default" | "warn";
}) {
  const accent =
    variant === "warn"
      ? "text-[var(--color-warn)]"
      : "text-[var(--color-accent)]";
  const border =
    variant === "warn"
      ? "border-[var(--color-warn)]/30"
      : "border-[var(--color-accent-dim)]";
  return (
    <div
      className={`flex items-start gap-3 border-l-2 ${border} pl-3 py-1`}
    >
      {num && (
        <div
          className={`shrink-0 w-4 font-mono text-[11px] ${accent} mt-px text-center`}
        >
          {num}
        </div>
      )}
      <div className="shrink-0 w-[112px]">
        <div
          className={`font-mono text-[10px] uppercase tracking-[0.14em] ${accent}`}
        >
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
