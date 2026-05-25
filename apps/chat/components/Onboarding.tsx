"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bc_onboarding_seen_v1";

export function OnboardingProvider() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* private mode etc */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-start justify-center pt-[8vh] bg-black/80 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[640px] max-w-[94vw] bg-[var(--color-panel)] border border-[var(--color-border-strong)] shadow-[0_24px_72px_rgba(0,0,0,0.8)] flex flex-col max-h-[82vh]"
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-4 border-b border-[var(--color-border)]">
          <div className="font-[var(--font-display)] text-[40px] leading-none tracking-[0.04em] text-[var(--color-accent-bright)] glow">
            blindchat
          </div>
          <div className="font-mono text-[13px] text-[var(--color-text-secondary)] mt-2">
            private chat with portable memory — running entirely in your browser
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-5 space-y-5 overflow-y-auto thin-scroll">
          <Section
            num="01"
            title="What this is"
            body="A chat UI where the LLM runs in a Trusted Execution Environment (Venice), your memory is encrypted and sharded across an independent network (Nillion's nilDB), and your text is embedded locally before any network call. No backend on our side. Your browser is the whole app."
          />

          <Section
            num="02"
            title="How privacy works, layer by layer"
          >
            <div className="space-y-2 mt-2">
              <Layer
                tag="inference"
                where="Venice"
                detail="TEE-hosted models — your prompt is processed inside an enclave the provider can't read. No logs."
              />
              <Layer
                tag="memory"
                where="BlindCache · Nillion"
                detail="Content is split into Shamir shares across 4 mainnet operators on 3 continents. They'd have to collude to decrypt."
              />
              <Layer
                tag="embeddings"
                where="local · in-browser"
                detail="Xenova all-MiniLM-L6-v2 runs in your tab via Transformers.js. Your text never leaves the SDK to be embedded."
              />
            </div>
          </Section>

          <Section
            num="03"
            title="What's not perfectly private"
          >
            <ul className="mt-2 space-y-1 font-mono text-[12px] text-[var(--color-text-secondary)]">
              <li>· memory metadata — tags, scope, timestamps — is stored as plaintext on nilDB nodes (queryable; semantic clusters visible to a node operator scraping all shares)</li>
              <li>· anything you type lives in your browser&apos;s memory until you close the tab</li>
              <li>· this site is the attack surface — a compromised browser or malicious extension can read your data</li>
            </ul>
          </Section>

          <Section
            num="04"
            title="Keys you control"
            body="Production will use a passkey (WebAuthn) to derive both keys. In this mock, the Venice API key is wired via .env.local on localhost. No key ever crosses our wire."
          />
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <div className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
            shown once · esc to dismiss
          </div>
          <button
            onClick={dismiss}
            className="font-mono text-[12px] uppercase tracking-[0.18em] px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-bright)] text-[var(--color-base)] font-medium transition"
          >
            start →
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  num,
  title,
  body,
  children,
}: {
  num: string;
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-1.5">
        <span className="font-mono text-[10px] text-[var(--color-accent)] tracking-[0.18em]">
          {num}
        </span>
        <h3 className="font-mono text-[13px] text-[var(--color-text-primary)] font-medium">
          {title}
        </h3>
      </div>
      {body && (
        <p className="font-mono text-[12px] leading-[1.6] text-[var(--color-text-secondary)] pl-9">
          {body}
        </p>
      )}
      {children && <div className="pl-9">{children}</div>}
    </section>
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
    <div className="flex items-start gap-3 border-l border-[var(--color-border)] pl-3 py-1">
      <div className="shrink-0 w-[100px]">
        <div className="font-mono text-[10px] text-[var(--color-accent)] uppercase tracking-[0.14em]">
          {tag}
        </div>
        <div className="font-mono text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
          {where}
        </div>
      </div>
      <div className="font-mono text-[12px] text-[var(--color-text-secondary)] leading-[1.55] flex-1">
        {detail}
      </div>
    </div>
  );
}
