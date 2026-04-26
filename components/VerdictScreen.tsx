"use client";

import { useEffect, useState } from "react";
import type { AnalyzedParagraph } from "@/lib/types";
import { generateFunnyVerdict } from "@/lib/verdict-generator";
import { useLanguage } from "@/contexts/LanguageContext";

interface VerdictScreenProps {
  paragraphs: AnalyzedParagraph[];
  totalDamage: number;
  onReset: () => void;
}

const SEVERITY_COLORS: Record<number, string> = {
  1: "#00ff41",
  2: "#00cc33",
  3: "#ff9900",
  4: "#ff0040",
  5: "#ff0040",
};

const CLASSIFIED_SEVERITY_COLORS: Record<number, string> = {
  1: "#4a4a4a",
  2: "#4a4a4a",
  3: "#c48500",
  4: "#c41e3a",
  5: "#c41e3a",
};

function generateBlockBar(filled: number, total: number = 10): string {
  const filledBlocks = Math.round((filled / 100) * total);
  return "█".repeat(filledBlocks) + "░".repeat(total - filledBlocks);
}

export default function VerdictScreen({ paragraphs, totalDamage, onReset }: VerdictScreenProps) {
  const { t, language, theme } = useLanguage();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [repairing, setRepairing] = useState(false);
  const [verdictMessage, setVerdictMessage] = useState("");
  const [showStamp, setShowStamp] = useState(false);

  useEffect(() => {
    setVerdictMessage(generateFunnyVerdict(paragraphs, totalDamage, language));
  }, [paragraphs, totalDamage, language]);

  const severity1 = paragraphs.filter((p) => p.severity === 1).length;
  const severity2 = paragraphs.filter((p) => p.severity === 2).length;
  const severity3 = paragraphs.filter((p) => p.severity === 3).length;
  const severity4 = paragraphs.filter((p) => p.severity === 4).length;
  const severity5 = paragraphs.filter((p) => p.severity === 5).length;
  const worstClauses = [...paragraphs].sort((a, b) => b.severity - a.severity).slice(0, 3);
  const maxPossible = paragraphs.length * 100;
  const damageRatio = maxPossible > 0 ? totalDamage / maxPossible : 0;
  const isDark = damageRatio > 0.5;
  const colors = {
    primary: isDark ? "#ff0040" : "#00ff41",
    secondary: isDark ? "#ff0040" : "#00cc33",
    dim: isDark ? "#7f001f" : "#004d1a",
    bg: isDark ? "#0d0000" : "#000000",
  };

  useEffect(() => {
    let start = 0;
    const target = totalDamage;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setAnimatedScore(start);
      if (start >= target) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [totalDamage]);

  // Stamp animation for classified
  useEffect(() => {
    if (theme === "classified") {
      const timer = setTimeout(() => setShowStamp(true), 800);
      return () => clearTimeout(timer);
    }
  }, [theme]);

  const handleReset = () => {
    setRepairing(true);
    setTimeout(() => onReset(), 1200);
  };

  if (theme === "classified") {
    return (
      <ClassifiedVerdictScreen
        t={t}
        paragraphs={paragraphs}
        totalDamage={totalDamage}
        animatedScore={animatedScore}
        verdictMessage={verdictMessage}
        damageRatio={damageRatio}
        severity1={severity1}
        severity2={severity2}
        severity3={severity3}
        severity4={severity4}
        severity5={severity5}
        worstClauses={worstClauses}
        showStamp={showStamp}
        repairing={repairing}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="verdict-screen min-h-screen flex flex-col bg-black relative overflow-hidden" style={{ backgroundColor: colors.bg }}>
      <div className={`fixed inset-0 z-0 pointer-events-none ${isDark ? "scanlines-red" : "scanlines"}`} aria-hidden="true" />
      <div className="grain-overlay fixed inset-0 z-0 pointer-events-none" style={{ opacity: damageRatio * 0.2 }} aria-hidden="true" />

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* Left column */}
        <div className="lg:col-span-4 p-8 lg:p-12 border-r flex flex-col" style={{ borderColor: `${colors.primary}20` }}>
          <div>
            <p className="font-mono text-xs tracking-[0.3em] mb-4" style={{ color: colors.dim }}>NO — 04</p>
            <h1 className={`font-pixel text-3xl lg:text-4xl mb-6 crt-flicker ${isDark ? "text-glow-red" : "text-glow-green"}`} style={{ color: colors.primary }}>
              {t.damageReport.split(" ").map((word, i) => (<span key={i}>{word}{i < t.damageReport.split(" ").length - 1 && <br />}</span>))}
            </h1>
            <div className="mb-8">
              <div className={`font-pixel text-[5rem] lg:text-[7rem] xl:text-[9rem] leading-none tabular-nums ${isDark ? "text-glow-red" : "text-glow-green"}`} style={{ color: colors.primary }}>
                {animatedScore}
              </div>
              <p className="font-mono text-xs mt-2" style={{ color: colors.dim }}>{t.damagePoints}</p>
            </div>
            <p className="font-pixel text-lg lg:text-xl leading-snug text-balance mb-8" style={{ color: colors.primary }}>{verdictMessage}</p>
          </div>
          <div className="mt-auto">
            <button
              onClick={handleReset} disabled={repairing}
              className="font-pixel px-8 py-4 text-sm transition-all duration-300 cursor-pointer border"
              style={{ borderColor: colors.primary, color: colors.primary, opacity: repairing ? 0.5 : 1 }}
              onMouseEnter={(e) => { if (!repairing) { e.currentTarget.style.backgroundColor = colors.primary; e.currentTarget.style.color = "#000000"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = colors.primary; }}
            >
              {repairing ? t.repairing : t.decodeAnother}
            </button>
          </div>
        </div>

        {/* Center column */}
        <div className="lg:col-span-4 p-8 lg:p-12 border-r flex flex-col" style={{ borderColor: `${colors.primary}20` }}>
          <p className="font-mono text-xs tracking-[0.2em] mb-6" style={{ color: colors.dim }}>{t.clauseBreakdown}</p>
          <div className="space-y-4 font-mono text-sm flex-1">
            {([5, 4, 3, 2, 1] as const).map((level) => {
              const count = [severity5, severity4, severity3, severity2, severity1][5 - level];
              const pct = paragraphs.length > 0 ? (count / paragraphs.length) * 100 : 0;
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-pixel text-xs" style={{ color: SEVERITY_COLORS[level] }}>{t.severityLabels[level as keyof typeof t.severityLabels]}</span>
                    <span style={{ color: colors.dim }}>{count}</span>
                  </div>
                  <div className="block-bar text-xs" style={{ color: SEVERITY_COLORS[level] }}>{generateBlockBar(pct)}</div>
                </div>
              );
            })}
          </div>
          <div className="pt-6 border-t mt-8" style={{ borderColor: `${colors.primary}20` }}>
            <div className="flex justify-between font-mono text-xs" style={{ color: colors.dim }}>
              <span>{t.totalClauses}</span><span>{paragraphs.length}</span>
            </div>
            <div className="flex justify-between font-mono text-xs mt-2" style={{ color: colors.dim }}>
              <span>{t.analysis}</span><span>{t.aiPowered}</span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 p-8 lg:p-12 flex flex-col">
          <p className="font-mono text-xs tracking-[0.2em] mb-6" style={{ color: colors.dim }}>{t.worst3}</p>
          <div className="space-y-4 flex-1">
            {worstClauses.map((clause, i) => {
              const clauseColor = SEVERITY_COLORS[clause.severity];
              return (
                <div key={i} className="p-4 border relative overflow-hidden"
                  style={{ borderColor: clause.severity >= 4 ? "rgba(255,0,64,0.5)" : `${colors.primary}30`, backgroundColor: clause.severity >= 4 ? "rgba(13,0,0,0.5)" : "transparent" }}>
                  {clause.severity >= 4 && (
                    <>
                      <div className="absolute pointer-events-none" style={{ left: "10%", width: "30%", top: "60%", height: "1em", background: "#000000", opacity: 0.8 }} />
                      <div className="absolute pointer-events-none" style={{ left: "50%", width: "25%", top: "75%", height: "0.9em", background: "#000000", opacity: 0.7 }} />
                    </>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs" style={{ color: colors.dim }}>{String(i + 1).padStart(2, "0")} —</span>
                    <span className="font-pixel text-xs" style={{ color: clauseColor }}>[SEV:{clause.severity}/5]</span>
                  </div>
                  <p className={`font-pixel text-sm leading-snug text-balance mb-2 ${clause.severity >= 4 ? "text-glow-red" : ""}`} style={{ color: clauseColor }}>
                    &ldquo;{clause.translation}&rdquo;
                  </p>
                  <p className="font-mono text-xs leading-relaxed line-clamp-2 relative z-10" style={{ color: colors.dim, opacity: 0.6 }}>
                    {clause.text.slice(0, 100)}...
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {repairing && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute left-0 right-0 h-2"
            style={{ background: "linear-gradient(to bottom, transparent, #00ff41, #00ff41, transparent)", boxShadow: "0 0 30px #00ff41, 0 0 60px #00ff41", animation: "repairSweep 1.2s linear forwards" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #000000 0%, transparent 50%)", animation: "repairSweep 1.2s linear forwards" }} />
        </div>
      )}
    </div>
  );
}

// ─── CLASSIFIED THEME ─────────────────────────────────────────────────────────

interface ClassifiedVerdictProps {
  t: ReturnType<typeof useLanguage>["t"];
  paragraphs: AnalyzedParagraph[];
  totalDamage: number;
  animatedScore: number;
  verdictMessage: string;
  damageRatio: number;
  severity1: number;
  severity2: number;
  severity3: number;
  severity4: number;
  severity5: number;
  worstClauses: AnalyzedParagraph[];
  showStamp: boolean;
  repairing: boolean;
  onReset: () => void;
}

function ClassifiedVerdictScreen({
  t, paragraphs, animatedScore, verdictMessage, damageRatio,
  severity1, severity2, severity3, severity4, severity5,
  worstClauses, showStamp, repairing, onReset,
}: ClassifiedVerdictProps) {
  const threatColor = damageRatio > 0.6 ? "#c41e3a" : damageRatio > 0.3 ? "#c48500" : "#4a4a4a";
  const threatLabel = damageRatio > 0.6 ? "HIGH" : damageRatio > 0.3 ? "MODERATE" : "LOW";

  return (
    <div className="verdict-screen min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: "#f0ebe3" }}>
      {/* Paper texture */}
      <div className="paper-texture fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />
      {/* Coffee stains */}
      <div className="coffee-stain fixed pointer-events-none" style={{ width: 200, height: 160, top: "10%", right: "-50px", zIndex: 0 }} aria-hidden="true" />
      <div className="coffee-stain fixed pointer-events-none" style={{ width: 130, height: 100, bottom: "25%", left: "-30px", zIndex: 0 }} aria-hidden="true" />

      {/* Stamp animation overlay */}
      {showStamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="animate-stamp-slam">
            <span
              className="stamp"
              style={{
                color: "#c41e3a",
                borderColor: "#c41e3a",
                fontSize: "clamp(2rem, 8vw, 5rem)",
                fontFamily: "monospace",
                letterSpacing: "0.25em",
                padding: "0.3em 0.6em",
                transform: "rotate(-8deg)",
                display: "block",
                opacity: 0.85,
              }}
            >
              {t.classifiedStampVerdict}
            </span>
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">

        {/* Left column — report summary */}
        <div className="lg:col-span-4 p-8 lg:p-12 border-r border-[rgba(26,26,26,0.15)] flex flex-col">
          <div className="flex-1">
            <p className="font-mono text-xs tracking-[0.3em] mb-4 text-[#4a4a4a] uppercase">File No. 04</p>

            <h1 className="font-mono text-3xl lg:text-4xl font-bold text-[#1a1a1a] mb-6 uppercase leading-tight">
              {t.threatAssessment}
            </h1>

            {/* Big threat score */}
            <div className="mb-6 relative">
              <div
                className="font-mono text-[5rem] lg:text-[6rem] xl:text-[7rem] leading-none tabular-nums font-bold"
                style={{ color: threatColor }}
              >
                {animatedScore}
              </div>
              <p className="font-mono text-xs mt-1 text-[#4a4a4a] uppercase tracking-widest">{t.damagePoints}</p>
              {/* Threat level badge */}
              <div
                className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 border-2 font-mono text-xs font-bold uppercase tracking-widest"
                style={{ borderColor: threatColor, color: threatColor, backgroundColor: "transparent" }}
              >
                <span>{t.threatLevel}: {threatLabel}</span>
              </div>
            </div>

            {/* Verdict message — typed on paper */}
            <div
              className="border border-[rgba(26,26,26,0.2)] p-4 mb-8 doc-margin-line"
              style={{ backgroundColor: "#ffffff", boxShadow: "2px 2px 0 rgba(26,26,26,0.06)" }}
            >
              <p className="font-mono text-xs text-[#4a4a4a] mb-2 uppercase tracking-widest">{t.analystNote}</p>
              <p className="font-mono text-sm leading-relaxed text-[#1a1a1a]">{verdictMessage}</p>
            </div>
          </div>

          {/* Reset button */}
          <div className="mt-auto">
            <button
              onClick={onReset}
              disabled={repairing}
              className="px-8 py-4 font-mono text-sm uppercase tracking-widest transition-all duration-300 border-2 font-bold"
              style={{
                borderColor: "#c41e3a",
                color: "#c41e3a",
                backgroundColor: "transparent",
                opacity: repairing ? 0.5 : 1,
                cursor: repairing ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!repairing) { e.currentTarget.style.backgroundColor = "#c41e3a"; e.currentTarget.style.color = "#ffffff"; }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#c41e3a";
              }}
            >
              {repairing ? t.repairing : t.fileNewDocument.replace(/[\[\]]/g, "")}
            </button>
          </div>
        </div>

        {/* Center column — breakdown */}
        <div className="lg:col-span-4 p-8 lg:p-12 border-r border-[rgba(26,26,26,0.15)] flex flex-col">
          <p className="font-mono text-xs tracking-[0.2em] mb-6 text-[#4a4a4a] uppercase">{t.clauseBreakdown}</p>

          <div className="space-y-4 flex-1">
            {([5, 4, 3, 2, 1] as const).map((level) => {
              const count = [severity5, severity4, severity3, severity2, severity1][5 - level];
              const pct = paragraphs.length > 0 ? (count / paragraphs.length) * 100 : 0;
              const clColor = CLASSIFIED_SEVERITY_COLORS[level];
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold uppercase" style={{ color: clColor }}>
                      {t.severityLabels[level as keyof typeof t.severityLabels]}
                    </span>
                    <span className="font-mono text-xs text-[#4a4a4a]">{count}</span>
                  </div>
                  {/* Paper bar */}
                  <div className="w-full h-3 border border-[rgba(26,26,26,0.15)]" style={{ backgroundColor: "#e8e3db" }}>
                    <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: clColor }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-[rgba(26,26,26,0.15)] mt-8">
            <div className="flex justify-between font-mono text-xs text-[#4a4a4a]">
              <span>{t.totalClauses}</span><span>{paragraphs.length}</span>
            </div>
            <div className="flex justify-between font-mono text-xs mt-2 text-[#4a4a4a]">
              <span>{t.analysis}</span><span>{t.aiPowered}</span>
            </div>
            <div className="mt-4">
              <span
                className="stamp stamp-dark"
                style={{ fontSize: "0.55rem", display: "inline-block" }}
              >
                {t.doNotDistribute}
              </span>
            </div>
          </div>
        </div>

        {/* Right column — worst clauses */}
        <div className="lg:col-span-4 p-8 lg:p-12 flex flex-col">
          <p className="font-mono text-xs tracking-[0.2em] mb-6 text-[#4a4a4a] uppercase">{t.worst3}</p>

          <div className="space-y-4 flex-1">
            {worstClauses.map((clause, i) => {
              const clColor = CLASSIFIED_SEVERITY_COLORS[clause.severity];
              return (
                <div
                  key={i}
                  className="p-4 border relative overflow-hidden"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: clause.severity >= 4 ? "rgba(196,30,58,0.3)" : "rgba(26,26,26,0.15)",
                    borderLeft: `3px solid ${clColor}`,
                    boxShadow: "2px 2px 0 rgba(26,26,26,0.06)",
                  }}
                >
                  {/* Redaction bars for severity 4-5 */}
                  {clause.severity >= 4 && (
                    <>
                      <div className="absolute pointer-events-none" style={{ left: "15%", width: "35%", top: "70%", height: "1.1em", background: "#1a1a1a", opacity: 0.7 }} />
                      <div className="absolute pointer-events-none" style={{ left: "55%", width: "25%", top: "82%", height: "0.9em", background: "#1a1a1a", opacity: 0.65 }} />
                    </>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-[#4a4a4a]">{String(i + 1).padStart(2, "0")} —</span>
                    <span className="font-mono text-xs font-bold uppercase" style={{ color: clColor }}>
                      SEV {clause.severity}/5
                    </span>
                  </div>

                  <p className="font-mono text-sm leading-snug text-balance mb-2 font-bold" style={{ color: clColor }}>
                    &ldquo;{clause.translation}&rdquo;
                  </p>

                  <p className="font-mono text-xs leading-relaxed line-clamp-2 relative z-10 text-[#4a4a4a] opacity-70">
                    {clause.text.slice(0, 100)}...
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
