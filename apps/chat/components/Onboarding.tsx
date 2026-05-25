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
        <div className="space-y-4">
          <p className="font-mono text-[14px] leading-[1.7] text-[var(--color-text-primary)]">
            private chat with portable memory.
          </p>
          <p className="font-mono text-[13px] leading-[1.7] text-[var(--color-text-secondary)]">
            three privacy layers stitched together: an LLM that runs in a
            hardware enclave, encrypted memory sharded across an independent
            network, and embeddings computed locally in your browser. no backend
            on our side. your browser is the whole app.
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
        <div className="space-y-3">
          <p className="font-mono text-[13px] leading-[1.7] text-[var(--color-text-secondary)]">
            no privacy claim is unconditional. here&apos;s what we don&apos;t
            defend against:
          </p>
          <ul className="font-mono text-[12px] leading-[1.7] text-[var(--color-text-secondary)] space-y-2 pl-1">
            <li>
              <span className="text-[var(--color-warn)]">·</span>{" "}
              <b className="text-[var(--color-text-primary)]">metadata</b> —
              tags, scope, timestamps live as plaintext on nilDB nodes for
              queryability. a node operator scraping all shares could see
              semantic clusters.
            </li>
            <li>
              <span className="text-[var(--color-warn)]">·</span>{" "}
              <b className="text-[var(--color-text-primary)]">browser memory</b>{" "}
              — anything you type lives in your tab&apos;s RAM until you close
              it.
            </li>
            <li>
              <span className="text-[var(--color-warn)]">·</span>{" "}
              <b className="text-[var(--color-text-primary)]">the page itself</b>{" "}
              is the attack surface. a compromised browser, malicious extension,
              or hijacked domain could read everything.
            </li>
          </ul>
        </div>
      ),
    },
    {
      num: "04 / 04",
      eyebrow: "your keys",
      title: "you hold them",
      image: "/onboarding/04-keys.jpg",
      body: (
        <div className="space-y-4">
          <p className="font-mono text-[13px] leading-[1.7] text-[var(--color-text-secondary)]">
            two keys do all the work: a Venice API key (TEE access) and a
            Nillion private key (vault identity). in this build they&apos;re
            wired via <span className="text-[var(--color-accent)]">.env.local</span> for
            localhost. in production they&apos;ll live in IndexedDB encrypted
            behind a passkey — and neither ever crosses our wire.
          </p>
          <div className="font-mono text-[12px] text-[var(--color-text-tertiary)] pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 bg-[var(--color-success)] rounded-full" />
              <span>all keys client-side · no accounts · no telemetry</span>
            </div>
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
        className="w-[560px] max-w-[94vw] bg-[var(--color-panel)] border border-[var(--color-border-strong)] shadow-[0_24px_72px_rgba(0,0,0,0.8)] flex flex-col"
      >
        {/* Top bar: progress + skip */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between">
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

        {/* Banner image */}
        {step.image && (
          <div className="px-6 pb-3">
            <div className="relative w-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-base)]" style={{ aspectRatio: "4 / 1" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={step.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-7 pt-1 pb-7">
          <div className="font-mono text-[10px] text-[var(--color-accent)] uppercase tracking-[0.22em] mb-2">
            {step.eyebrow}
          </div>
          {idx === 0 ? (
            <h2 className="font-[var(--font-display)] text-[40px] leading-none tracking-[0.04em] text-[var(--color-accent-bright)] glow mb-5">
              {step.title}
            </h2>
          ) : (
            <h2 className="font-mono text-[18px] font-medium text-[var(--color-text-primary)] mb-4">
              {step.title}
            </h2>
          )}
          {step.body}
        </div>

        {/* Footer: back / continue */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
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
    <div className="flex items-start gap-3 border-l-2 border-[var(--color-accent-dim)] pl-4 py-1.5">
      <div className="shrink-0 w-[110px]">
        <div className="font-mono text-[10px] text-[var(--color-accent)] uppercase tracking-[0.14em]">
          {tag}
        </div>
        <div className="font-mono text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
          {where}
        </div>
      </div>
      <div className="font-mono text-[12px] text-[var(--color-text-secondary)] leading-[1.6] flex-1">
        {detail}
      </div>
    </div>
  );
}
