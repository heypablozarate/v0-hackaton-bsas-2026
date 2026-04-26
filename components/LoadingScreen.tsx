"use client";

import { useEffect, useState, useRef } from "react";
import type { AnalyzedParagraph } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface LoadingScreenProps {
  text: string;
  onComplete: (paragraphs: AnalyzedParagraph[], source: "ai" | "fallback") => void;
  onInvalid: (reason: string) => void;
}

const TERMINAL_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;':\",./<>?█▓▒░";

function generateBlockBar(progress: number, length: number = 20): string {
  const filled = Math.floor((progress / 100) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
}

export default function LoadingScreen({ text, onComplete, onInvalid }: LoadingScreenProps) {
  const { t, language, theme } = useLanguage();
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [statusIdx, setStatusIdx] = useState(0);
  const [phase, setPhase] = useState<"scanning" | "done">("scanning");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingResult = useRef<{ paragraphs: AnalyzedParagraph[]; source: "ai" | "fallback" } | null>(null);
  const animDoneRef = useRef(false);
  const fetchDoneRef = useRef(false);

  const words = text.split(/\s+/);
  const lineSize = 8;
  const lines = Array.from({ length: Math.ceil(words.length / lineSize) }, (_, i) =>
    words.slice(i * lineSize, i * lineSize + lineSize).join(" ")
  );

  function tryComplete() {
    if (animDoneRef.current && fetchDoneRef.current && pendingResult.current) {
      setPhase("done");
      const { paragraphs, source } = pendingResult.current;
      setTimeout(() => onComplete(paragraphs, source), 600);
    }
  }

  useEffect(() => {
    let idx = 0;
    intervalRef.current = setInterval(() => {
      if (idx >= lines.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        animDoneRef.current = true;
        tryComplete();
        return;
      }
      const line = lines[idx];
      const garbled = line
        .split("")
        .map((char) =>
          Math.random() > 0.4 && char !== " "
            ? TERMINAL_CHARS[Math.floor(Math.random() * TERMINAL_CHARS.length)]
            : char
        )
        .join("");
      setDisplayedLines((prev) => [...prev, garbled].slice(-20));
      idx++;
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    statusIntervalRef.current = setInterval(() => {
      setStatusIdx((i) => (i + 1) % t.statusMessages.length);
    }, 1500);
    return () => { if (statusIntervalRef.current) clearInterval(statusIntervalRef.current); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnalysis() {
      try {
        const sections = text.split(/\n\s*---\s*\n/).filter((s) => s.trim().length > 0);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sections.length > 1 ? sections : [text], isMultiSection: sections.length > 1, language }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 422 && data.error === "not_legal") {
          onInvalid(data.reason ?? "This does not appear to be a legal document.");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        pendingResult.current = { paragraphs: data.paragraphs, source: data.source ?? "ai" };
        fetchDoneRef.current = true;
        tryComplete();
      } catch (err) {
        if (cancelled) return;
        console.error("[LoadingScreen] Fetch error:", err);
        setError(t.errFallback);
        setTimeout(() => {
          if (cancelled) return;
          import("@/lib/analyzer").then(({ analyzeText }) => {
            const paragraphs = analyzeText(text, language);
            pendingResult.current = { paragraphs, source: "fallback" };
            fetchDoneRef.current = true;
            tryComplete();
          });
        }, 1000);
      }
    }
    fetchAnalysis();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [displayedLines]);

  const progress = Math.min((displayedLines.length / Math.max(lines.length, 1)) * 100, phase === "done" ? 100 : 95);

  if (theme === "classified") {
    return (
      <ClassifiedLoadingScreen
        t={t}
        displayedLines={displayedLines}
        phase={phase}
        progress={progress}
        statusIdx={statusIdx}
        error={error}
        linesCount={lines.length}
        containerRef={containerRef}
      />
    );
  }

  return (
    <div className="loading-screen min-h-screen flex flex-col bg-black relative overflow-hidden">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* Left column */}
        <div className="lg:col-span-3 p-8 lg:p-12 border-r border-[rgba(0,255,65,0.2)] flex flex-col justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-[#004d1a] mb-4">NO — 02</p>
            <h2 className="font-pixel text-2xl lg:text-3xl text-[#00ff41] mb-6 crt-flicker">{t.scanning}</h2>
            <p className="font-mono text-xs text-[#004d1a]">{t.linesQueued.replace("{count}", String(lines.length))}</p>
          </div>
          <div className="space-y-4">
            <div>
              <p className="font-mono text-xs text-[#004d1a] mb-2">{t.progress}</p>
              <p className="font-mono text-sm text-[#00ff41]">[{generateBlockBar(progress)}]</p>
              <p className="font-pixel text-lg text-[#00ff41] mt-1">{Math.round(progress)}%</p>
            </div>
          </div>
        </div>

        {/* Center column */}
        <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[rgba(0,255,65,0.2)]">
              <div className="w-2 h-2 bg-[#004d1a]" />
              <div className="w-2 h-2 bg-[#00cc33]" />
              <div className="w-2 h-2 bg-[#00ff41]" />
              <span className="ml-3 font-mono text-xs text-[#004d1a]">legal-analyzer.exe</span>
            </div>
            <div
              ref={containerRef}
              className="flex-1 bg-black border border-[rgba(0,255,65,0.2)] p-4 overflow-hidden font-mono text-xs leading-5 min-h-[300px]"
              aria-live="polite"
            >
              {displayedLines.map((line, i) => (
                <p key={i} className="text-[#00ff41]">
                  <span className="text-[#004d1a] mr-2 select-none">$</span>{line}
                </p>
              ))}
              {phase === "scanning" && (
                <span className="inline-block w-2 h-4 bg-[#00ff41] animate-blink ml-1" aria-hidden="true" />
              )}
            </div>
          </div>
          <div className="mt-6 text-center">
            {error ? (
              <p className="font-pixel text-sm text-[#ff0040]">{error}</p>
            ) : (
              <p className="font-pixel text-sm text-[#00ff41] crt-flicker min-h-[1.5em]">
                {phase === "done" ? t.analysisComplete : t.statusMessages[statusIdx]}
              </p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-3 p-8 lg:p-12 border-l border-[rgba(0,255,65,0.2)] flex flex-col justify-between">
          <div>
            <p className="font-mono text-xs text-[#004d1a] mb-4">{t.operations}</p>
            <div className="space-y-2 font-mono text-xs">
              <p className="text-[#00ff41]">[*] {t.tokenizing}</p>
              <p className={progress > 20 ? "text-[#00ff41]" : "text-[#004d1a]"}>{progress > 20 ? "[*]" : "[ ]"} {t.parsing}</p>
              <p className={progress > 40 ? "text-[#00ff41]" : "text-[#004d1a]"}>{progress > 40 ? "[*]" : "[ ]"} {t.classifying}</p>
              <p className={progress > 60 ? "text-[#00ff41]" : "text-[#004d1a]"}>{progress > 60 ? "[*]" : "[ ]"} {t.scoring}</p>
              <p className={progress > 80 ? "text-[#00ff41]" : "text-[#004d1a]"}>{progress > 80 ? "[*]" : "[ ]"} {t.translating}</p>
              <p className={phase === "done" ? "text-[#00ff41]" : "text-[#004d1a]"}>{phase === "done" ? "[*]" : "[ ]"} {t.complete}</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <p className="font-mono text-xs text-[#004d1a]">{t.aiPowered}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CLASSIFIED THEME ─────────────────────────────────────────────────────────

interface ClassifiedLoadingProps {
  t: ReturnType<typeof useLanguage>["t"];
  displayedLines: string[];
  phase: "scanning" | "done";
  progress: number;
  statusIdx: number;
  error: string | null;
  linesCount: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function ClassifiedLoadingScreen({ t, displayedLines, phase, progress, statusIdx, error, linesCount, containerRef }: ClassifiedLoadingProps) {
  const ops = [
    { label: t.tokenizing, threshold: 0 },
    { label: t.parsing, threshold: 20 },
    { label: t.classifying, threshold: 40 },
    { label: t.scoring, threshold: 60 },
    { label: t.translating, threshold: 80 },
    { label: t.complete, threshold: 100 },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: "#f0ebe3" }}>
      {/* Paper texture */}
      <div className="paper-texture fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />
      {/* Coffee stain */}
      <div className="coffee-stain fixed pointer-events-none" style={{ width: 220, height: 170, top: "55%", right: "-60px", zIndex: 0 }} aria-hidden="true" />

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">

        {/* Left column — status */}
        <div className="lg:col-span-3 p-8 lg:p-12 flex flex-col justify-between border-r border-[rgba(26,26,26,0.15)]">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-[#4a4a4a] mb-4 uppercase">File No. 02</p>
            <h2 className="font-mono text-2xl lg:text-3xl font-bold text-[#1a1a1a] mb-6 uppercase tracking-wide">
              {t.processingDocument}
            </h2>
            <p className="font-mono text-xs text-[#4a4a4a] uppercase">
              {t.linesQueued.replace("{count}", String(linesCount))}
            </p>
          </div>

          {/* Progress meter */}
          <div className="space-y-4">
            <div>
              <p className="font-mono text-xs text-[#4a4a4a] mb-2 uppercase tracking-widest">{t.progress}</p>
              {/* Paper progress bar */}
              <div className="w-full h-4 border border-[rgba(26,26,26,0.3)] relative overflow-hidden" style={{ backgroundColor: "#e8e3db" }}>
                <div
                  className="absolute left-0 top-0 bottom-0 transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: "#1a1a1a" }}
                />
              </div>
              <p className="font-mono text-lg font-bold text-[#1a1a1a] mt-2">{Math.round(progress)}%</p>
            </div>

            {/* Clearance pending */}
            <div className="border border-[rgba(26,26,26,0.3)] p-3" style={{ backgroundColor: "#ffffff" }}>
              <p className="font-mono text-xs text-[#4a4a4a] uppercase tracking-widest">
                {phase === "done" ? t.declassifiedByAi : t.clearancePending}
              </p>
            </div>
          </div>
        </div>

        {/* Center column — document feed */}
        <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col">
          {/* Document header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(26,26,26,0.2)]">
            <span className="font-mono text-xs text-[#4a4a4a] uppercase tracking-widest">DOCUMENT FEED</span>
            <span className="font-mono text-xs text-[#4a4a4a]">PROCESSING...</span>
          </div>

          {/* "Document" — paper-style */}
          <div
            className="flex-1 flex flex-col border border-[rgba(26,26,26,0.25)] overflow-hidden"
            style={{ backgroundColor: "#ffffff", boxShadow: "2px 4px 12px rgba(0,0,0,0.12)" }}
          >
            {/* Document top bar */}
            <div className="px-5 py-3 border-b border-[rgba(26,26,26,0.15)] flex items-center justify-between" style={{ backgroundColor: "#f8f5f0" }}>
              <span className="font-mono text-xs font-bold text-[#1a1a1a] uppercase tracking-widest">LEGAL ANALYZER v2.0</span>
              <span className="stamp stamp-red text-xs px-2 py-0.5" style={{ fontSize: "0.6rem" }}>
                {t.confidential}
              </span>
            </div>

            {/* Scrolling lines */}
            <div
              ref={containerRef as React.RefObject<HTMLDivElement>}
              className="flex-1 p-5 overflow-hidden font-mono text-xs leading-6 doc-margin-line"
              style={{ minHeight: 300 }}
              aria-live="polite"
            >
              {displayedLines.map((line, i) => (
                <p key={i} className="text-[#1a1a1a] opacity-60">
                  {line}
                </p>
              ))}
              {phase === "scanning" && (
                <span className="inline-block w-2 h-4 bg-[#1a1a1a] typewriter-cursor" aria-hidden="true" />
              )}
            </div>
          </div>

          {/* Status message */}
          <div className="mt-6 text-center">
            {error ? (
              <p className="font-mono text-sm text-[#c41e3a] font-bold uppercase">{error}</p>
            ) : (
              <p className="font-mono text-sm text-[#1a1a1a] font-bold uppercase tracking-widest min-h-[1.5em]">
                {phase === "done" ? t.analysisComplete : t.statusMessages[statusIdx]}
              </p>
            )}
          </div>
        </div>

        {/* Right column — ops checklist */}
        <div className="lg:col-span-3 p-8 lg:p-12 flex flex-col justify-between border-l border-[rgba(26,26,26,0.15)]">
          <div>
            <p className="font-mono text-xs text-[#4a4a4a] mb-4 uppercase tracking-widest">{t.operations}</p>
            <div className="space-y-3">
              {ops.map((op, i) => {
                const active = progress >= op.threshold || phase === "done";
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 border flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: active ? "#1a1a1a" : "rgba(26,26,26,0.25)" }}
                    >
                      {active && <span className="font-mono text-xs font-bold text-[#1a1a1a]">&#10003;</span>}
                    </div>
                    <p className="font-mono text-xs uppercase" style={{ color: active ? "#1a1a1a" : "#9a9a9a" }}>
                      {op.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:block border-t border-[rgba(26,26,26,0.15)] pt-4">
            <p className="font-mono text-xs text-[#4a4a4a] uppercase">{t.aiPowered}</p>
            <p className="font-mono text-xs text-[#4a4a4a] mt-1 uppercase">{t.eyesOnly}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
