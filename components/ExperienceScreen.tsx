"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalyzedParagraph } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExperienceScreenProps {
  paragraphs: AnalyzedParagraph[];
  onComplete: (totalDamage: number) => void;
  onDamageChange?: (damage: number) => void;
  analysisSource?: "ai" | "fallback";
}

function getDamageColors(ratio: number) {
  if (ratio < 0.2) return { primary: "#00ff41", secondary: "#00cc33", dim: "#004d1a", bg: "#000000" };
  if (ratio < 0.4) return { primary: "#00ff41", secondary: "#00cc33", dim: "#004d1a", bg: "#000000" };
  if (ratio < 0.6) return { primary: "#ff9900", secondary: "#cc7a00", dim: "#4d2e00", bg: "#0a0500" };
  if (ratio < 0.8) return { primary: "#ff0040", secondary: "#cc0033", dim: "#4d0013", bg: "#0d0000" };
  return { primary: "#ff0040", secondary: "#ff0040", dim: "#7f001f", bg: "#1a0000" };
}

function glitchText(text: string, intensity: number): string {
  if (intensity < 0.3) return text;
  const glitchChars = "█▓▒░▄▀■□▪▫◆◇○●";
  return text
    .split("")
    .map((char) =>
      Math.random() < intensity * 0.08 && char !== " "
        ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
        : char
    )
    .join("");
}

function generateRedactionMarks(textLength: number, severity: number): { left: number; width: number }[] {
  if (severity < 4) return [];
  const marks: { left: number; width: number }[] = [];
  const numMarks = severity === 5 ? Math.floor(Math.random() * 4) + 3 : Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < numMarks; i++) {
    marks.push({ left: Math.random() * 80, width: 10 + Math.random() * 25 });
  }
  return marks;
}

// Classified severity colors — paper palette
const CLASSIFIED_SEVERITY: Record<number, { border: string; badge: string; bg: string; text: string; stamp?: string }> = {
  1: { border: "rgba(26,26,26,0.15)", badge: "#4a4a4a", bg: "#ffffff", text: "#1a1a1a" },
  2: { border: "rgba(26,26,26,0.2)", badge: "#4a4a4a", bg: "#ffffff", text: "#1a1a1a" },
  3: { border: "rgba(205,133,0,0.5)", badge: "#c48500", bg: "#fff9f0", text: "#1a1a1a", stamp: "#c48500" },
  4: { border: "rgba(196,30,58,0.4)", badge: "#c41e3a", bg: "#fff5f5", text: "#1a1a1a", stamp: "#c41e3a" },
  5: { border: "rgba(196,30,58,0.8)", badge: "#c41e3a", bg: "#fff0f0", text: "#1a1a1a", stamp: "#c41e3a" },
};

function useExperienceLogic(paragraphs: AnalyzedParagraph[], onComplete: (d: number) => void, onDamageChange?: (d: number) => void) {
  const [cumulativeDamage, setCumulativeDamage] = useState(0);
  const [visibleParagraphs, setVisibleParagraphs] = useState<Set<number>>(new Set());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [glitchIndex, setGlitchIndex] = useState<number | null>(null);
  const [glitchedTexts, setGlitchedTexts] = useState<Record<number, string>>({});
  const [shaking, setShaking] = useState(false);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [redactionMarks, setRedactionMarks] = useState<Record<number, { left: number; width: number }[]>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);
  const damageRef = useRef(0);
  const flashedIndices = useRef<Set<number>>(new Set());

  const maxPossibleDamage = paragraphs.length * 100;
  const damageRatio = Math.min(cumulativeDamage / Math.max(maxPossibleDamage, 1), 1);

  useEffect(() => {
    const marks: Record<number, { left: number; width: number }[]> = {};
    paragraphs.forEach((p, i) => { if (p.severity >= 4) marks[i] = generateRedactionMarks(p.text.length, p.severity); });
    setRedactionMarks(marks);
  }, [paragraphs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const highSeverityIndices = paragraphs
        .map((p, i) => ({ p, i }))
        .filter(({ p, i }) => p.severity >= 4 && visibleParagraphs.has(i))
        .map(({ i }) => i);
      if (highSeverityIndices.length > 0 && damageRatio > 0.3) {
        const idx = highSeverityIndices[Math.floor(Math.random() * highSeverityIndices.length)];
        setGlitchIndex(idx);
        setGlitchedTexts((prev) => ({ ...prev, [idx]: glitchText(paragraphs[idx].text, paragraphs[idx].severity === 5 ? 0.9 : 0.5) }));
        setTimeout(() => { setGlitchIndex(null); setGlitchedTexts((prev) => { const next = { ...prev }; delete next[idx]; return next; }); }, 120);
      }
    }, 400);
    return () => clearInterval(interval);
  }, [paragraphs, visibleParagraphs, damageRatio]);

  useEffect(() => {
    const hasVisible5 = paragraphs.some((p, i) => p.severity === 5 && visibleParagraphs.has(i));
    if (hasVisible5 && damageRatio > 0.5) {
      const interval = setInterval(() => { setShaking(true); setTimeout(() => setShaking(false), 200); }, 2500);
      return () => clearInterval(interval);
    }
  }, [paragraphs, visibleParagraphs, damageRatio]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = parseInt(entry.target.getAttribute("data-idx") ?? "-1");
          if (idx < 0) return;
          if (entry.isIntersecting) {
            setVisibleParagraphs((prev) => { const next = new Set(prev); next.add(idx); return next; });
            setCurrentIndex(idx);
            const p = paragraphs[idx];
            if (p.severity === 5 && !flashedIndices.current.has(idx)) {
              flashedIndices.current.add(idx);
              setFlashIndex(idx);
              setTimeout(() => setFlashIndex(null), 150);
            }
            const dmg = (p.severity - 1) * 25;
            damageRef.current = Math.min(damageRef.current + dmg, maxPossibleDamage);
            setCumulativeDamage(damageRef.current);
            onDamageChange?.(damageRef.current);
          }
        });
      },
      { threshold: 0.3 }
    );
    paragraphRefs.current.forEach((el) => { if (el) observerRef.current?.observe(el); });
    return () => observerRef.current?.disconnect();
  }, [paragraphs, maxPossibleDamage, onDamageChange]);

  return {
    cumulativeDamage, damageRatio, visibleParagraphs, hoveredIndex, setHoveredIndex,
    currentIndex, glitchIndex, glitchedTexts, shaking, flashIndex, redactionMarks,
    containerRef, paragraphRefs, damageRef,
  };
}

export default function ExperienceScreen({ paragraphs, onComplete, onDamageChange, analysisSource = "ai" }: ExperienceScreenProps) {
  const { t, theme } = useLanguage();
  const logic = useExperienceLogic(paragraphs, onComplete, onDamageChange);
  const { damageRatio, cumulativeDamage, hoveredIndex, setHoveredIndex, currentIndex,
    glitchIndex, glitchedTexts, shaking, flashIndex, redactionMarks, containerRef, paragraphRefs, damageRef } = logic;

  const colors = getDamageColors(damageRatio);
  const maxPossibleDamage = paragraphs.length * 100;
  const currentParagraph = paragraphs[hoveredIndex ?? currentIndex];
  const jitterClass = damageRatio > 0.4 ? "animate-jitter" : "";

  if (theme === "classified") {
    return (
      <ClassifiedExperienceScreen
        t={t}
        paragraphs={paragraphs}
        damageRatio={damageRatio}
        cumulativeDamage={cumulativeDamage}
        maxPossibleDamage={maxPossibleDamage}
        currentIndex={currentIndex}
        currentParagraph={currentParagraph}
        hoveredIndex={hoveredIndex}
        setHoveredIndex={setHoveredIndex}
        glitchIndex={glitchIndex}
        glitchedTexts={glitchedTexts}
        flashIndex={flashIndex}
        redactionMarks={redactionMarks}
        shaking={shaking}
        containerRef={containerRef}
        paragraphRefs={paragraphRefs}
        damageRef={damageRef}
        onComplete={onComplete}
        analysisSource={analysisSource}
      />
    );
  }

  return (
    <div className={`experience-screen relative min-h-screen ${shaking ? "animate-shake" : ""}`}
      style={{ backgroundColor: colors.bg, transition: "background-color 1s ease" }}
    >
      <div className={`pointer-events-none fixed inset-0 z-10 ${damageRatio > 0.5 ? "scanlines-red" : "scanlines"}`}
        style={{ opacity: 0.4 + damageRatio * 0.6 }} aria-hidden="true" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-10" style={{ opacity: damageRatio * 0.4 }} aria-hidden="true" />
      <div className="grain-overlay pointer-events-none fixed inset-0 z-10" style={{ opacity: damageRatio * 0.3 }} aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 z-10"
        style={{ background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${0.5 + damageRatio * 0.5}) 100%)` }}
        aria-hidden="true" />
      {flashIndex !== null && <div className="pointer-events-none fixed inset-0 z-20 animate-screen-flash" aria-hidden="true" />}
      {damageRatio > 0.7 && shaking && <div className="pointer-events-none fixed inset-0 z-20 bg-[#00ff41] animate-invert-flash" aria-hidden="true" />}

      <div className="experience-layout relative z-10">
        {/* LEFT COLUMN */}
        <div className="hidden lg:flex flex-col justify-between p-6 border-r sticky top-0 h-screen overflow-hidden"
          style={{ borderColor: `${colors.primary}33` }}>
          <div>
            <p className="font-mono text-xs tracking-[0.3em] mb-4" style={{ color: colors.dim }}>NO — 03</p>
            <div className="mb-8">
              <p className="font-mono text-xs mb-1" style={{ color: colors.dim }}>{t.section}</p>
              <p className={`font-pixel text-4xl ${jitterClass}`} style={{ color: colors.primary }}>{String(currentIndex + 1).padStart(2, "0")}</p>
              <p className="font-mono text-xs" style={{ color: colors.dim }}>/ {String(paragraphs.length).padStart(2, "0")}</p>
            </div>
            <div className="mb-8">
              <p className="font-mono text-xs mb-1" style={{ color: colors.dim }}>{t.category}</p>
              <p className="font-pixel text-sm" style={{ color: colors.primary }}>
                [{t.categories[(currentParagraph?.category || "other") as keyof typeof t.categories]}]
              </p>
            </div>
            <div className="mb-8">
              <p className="font-mono text-xs mb-1" style={{ color: colors.dim }}>{t.damage}</p>
              <p className={`font-pixel text-3xl ${damageRatio > 0.5 ? "text-glow-red" : "text-glow-green"}`} style={{ color: colors.primary }}>
                {Math.round(damageRatio * 100)}%
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-1 h-48 relative" style={{ backgroundColor: `${colors.primary}20` }}>
              <div className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                style={{ height: `${(currentIndex / Math.max(paragraphs.length - 1, 1)) * 100}%`, backgroundColor: colors.primary }} />
            </div>
            <p className="font-mono text-xs mt-2" style={{ color: colors.dim }}>{t.scroll}</p>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div ref={containerRef} className="flex-1 overflow-y-auto h-screen" style={{ scrollSnapType: "y proximity" }}>
          <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b lg:hidden"
            style={{ backgroundColor: "rgba(0,0,0,0.95)", borderColor: `${colors.primary}33`, backdropFilter: "blur(8px)" }}>
            <span className="font-pixel text-xs" style={{ color: colors.primary }}>[DAMAGE: {Math.round(damageRatio * 100)}%]</span>
          </div>

          <div className="px-6 py-8 border-b" style={{ borderColor: `${colors.primary}20` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs mb-1" style={{ color: colors.dim }}>{t.readingTerms}</p>
                <p className="font-pixel text-lg" style={{ color: colors.primary }}>{t.clausesDetected.replace("{count}", String(paragraphs.length))}</p>
              </div>
              {analysisSource === "ai" && (
                <span className="hidden lg:block font-pixel text-xs px-2 py-1 border" style={{ borderColor: `${colors.primary}50`, color: colors.primary }}>[AI]</span>
              )}
            </div>
          </div>

          <div className="px-6 py-8 space-y-4">
            {paragraphs.map((paragraph, idx) => {
              const severity = paragraph.severity;
              const isHovered = hoveredIndex === idx;
              const isGlitching = glitchIndex === idx;
              const marks = redactionMarks[idx] || [];
              const severityColors = {
                1: { bg: "#000000", text: "#00ff41", border: "rgba(0,255,65,0.3)" },
                2: { bg: "#000000", text: "#00cc33", border: "rgba(0,255,65,0.4)" },
                3: { bg: "#0a0500", text: "#ff9900", border: "rgba(255,153,0,0.5)" },
                4: { bg: "#0d0000", text: "#ff0040", border: "rgba(255,0,64,0.6)" },
                5: { bg: "#1a0000", text: "#ff0040", border: "rgba(255,0,64,0.8)" },
              }[severity] || { bg: "#000000", text: "#00ff41", border: "rgba(0,255,65,0.3)" };
              const lineHeight = severity >= 3 ? 1.5 - (severity - 3) * 0.1 : 1.6;
              const skewDeg = severity >= 4 && damageRatio > 0.4 ? Math.sin(idx * 1.3) * 0.5 : 0;

              return (
                <div key={idx} ref={(el) => { paragraphRefs.current[idx] = el; }} data-idx={idx}
                  onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}
                  className={`relative transition-all duration-500 ${severity >= 4 ? "paragraph-block-danger" : "paragraph-block"}`}
                  style={{
                    backgroundColor: severityColors.bg, padding: "1.25rem",
                    border: `1px solid ${severityColors.border}`,
                    transform: `skewX(${skewDeg}deg)${severity >= 5 ? " scale(1.01)" : ""}`,
                    boxShadow: severity >= 5
                      ? `0 0 40px rgba(255,0,64,${damageRatio * 0.5}), inset 0 0 30px rgba(0,0,0,0.6)`
                      : severity >= 4 ? `0 0 20px rgba(255,0,64,${damageRatio * 0.3})` : "none",
                    scrollSnapAlign: severity >= 4 ? "start" : "none",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs" style={{ color: severityColors.text, opacity: 0.6 }}>
                      {String(idx + 1).padStart(2, "0")} — [{t.categories[paragraph.category as keyof typeof t.categories] || t.categories.other}]
                    </span>
                    <span className={`font-pixel text-xs ${severity >= 4 ? "text-glow-red" : ""}`} style={{ color: severityColors.text }}>
                      [SEV:{severity}/5]
                    </span>
                  </div>
                  <div className="relative">
                    <p className="font-mono text-sm" style={{ color: severityColors.text, lineHeight, fontWeight: severity >= 3 ? 450 + (severity - 3) * 50 : 400, opacity: severity >= 5 && damageRatio > 0.6 ? 0.7 : 1 }}>
                      {isGlitching && glitchedTexts[idx] ? glitchedTexts[idx] : paragraph.text}
                    </p>
                    {severity >= 4 && damageRatio > 0.3 && marks.map((mark, mi) => (
                      <div key={mi} className="absolute pointer-events-none"
                        style={{ left: `${mark.left}%`, width: `${mark.width}%`, top: `${Math.random() * 60}%`, height: "1.3em", background: "#000000", transform: `skewX(${(Math.random() - 0.5) * 4}deg)`, opacity: 0.85 }} />
                    ))}
                  </div>
                  {severity === 5 && damageRatio > 0.4 && !isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `rotate(${(Math.random() - 0.5) * 6}deg)` }}>
                      <p className="font-pixel text-xl md:text-2xl text-center px-4 glitch-text text-glow-red" style={{ color: "#ff0040", opacity: 0.9 }} data-text={paragraph.translation.slice(0, 50)}>
                        {paragraph.translation.slice(0, 50)}{paragraph.translation.length > 50 ? "..." : ""}
                      </p>
                    </div>
                  )}
                  {isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 p-6" style={{ backgroundColor: "rgba(0,0,0,0.97)" }}>
                      <div className="text-center max-w-md">
                        <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: colors.dim }}>{t.humanTranslation}</p>
                        <p className={`font-pixel leading-snug text-balance ${severity >= 5 ? "text-xl md:text-2xl" : severity >= 4 ? "text-lg md:text-xl" : "text-base md:text-lg"} ${severity >= 4 ? "glitch-text text-glow-red" : severity >= 3 ? "text-glow-amber" : "text-glow-green"}`}
                          style={{ color: severityColors.text }} data-text={paragraph.translation}>
                          {paragraph.translation}
                        </p>
                        {(paragraph.matches ?? []).length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1 justify-center">
                            {(paragraph.matches ?? []).map((match, mi) => (
                              <span key={mi} className="font-mono text-xs px-2 py-0.5 border" style={{ borderColor: `${colors.primary}30`, color: colors.secondary }}>{match}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="text-center py-16" style={{ color: colors.primary }}>
              <p className="font-mono text-xs uppercase tracking-widest mb-6">{t.endOfDocument}</p>
              <button onClick={() => onComplete(damageRef.current)}
                className="font-pixel px-8 py-3 text-sm transition-all duration-300 cursor-pointer border hover:bg-current hover:text-black"
                style={{ borderColor: colors.primary, color: colors.primary }}>
                {t.seeVerdict}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="hidden lg:flex flex-col p-6 border-l sticky top-0 h-screen overflow-hidden" style={{ borderColor: `${colors.primary}33` }}>
          <div>
            <p className="font-mono text-xs tracking-[0.2em] mb-4" style={{ color: colors.dim }}>TRANSLATION</p>
            {currentParagraph && (
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-xs mb-2" style={{ color: colors.dim }}>SEVERITY {currentParagraph.severity}/5</p>
                  <div className="w-full h-1 mb-4" style={{ backgroundColor: `${colors.primary}20` }}>
                    <div className="h-full transition-all duration-300"
                      style={{ width: `${(currentParagraph.severity / 5) * 100}%`, backgroundColor: currentParagraph.severity >= 4 ? "#ff0040" : currentParagraph.severity >= 3 ? "#ff9900" : "#00ff41" }} />
                  </div>
                </div>
                <p className={`font-pixel text-sm leading-relaxed ${currentParagraph.severity >= 4 ? "text-glow-red" : currentParagraph.severity >= 3 ? "text-glow-amber" : "text-glow-green"}`}
                  style={{ color: currentParagraph.severity >= 4 ? "#ff0040" : currentParagraph.severity >= 3 ? "#ff9900" : "#00ff41" }}>
                  {currentParagraph.translation}
                </p>
                {(currentParagraph.matches ?? []).length > 0 && (
                  <div className="pt-4 border-t" style={{ borderColor: `${colors.primary}20` }}>
                    <p className="font-mono text-xs mb-2" style={{ color: colors.dim }}>MATCHED KEYWORDS</p>
                    <div className="flex flex-wrap gap-1">
                      {(currentParagraph.matches ?? []).map((match, mi) => (
                        <span key={mi} className="font-mono text-xs px-1.5 py-0.5 border" style={{ borderColor: `${colors.primary}30`, color: colors.secondary }}>{match}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-auto pt-6 border-t" style={{ borderColor: `${colors.primary}20` }}>
            <p className="font-mono text-xs" style={{ color: colors.dim }}>HOVER ANY CLAUSE<br />FOR FULL DETAILS</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CLASSIFIED THEME ─────────────────────────────────────────────────────────

interface ClassifiedExperienceProps {
  t: ReturnType<typeof useLanguage>["t"];
  paragraphs: AnalyzedParagraph[];
  damageRatio: number;
  cumulativeDamage: number;
  maxPossibleDamage: number;
  currentIndex: number;
  currentParagraph: AnalyzedParagraph | undefined;
  hoveredIndex: number | null;
  setHoveredIndex: (i: number | null) => void;
  glitchIndex: number | null;
  glitchedTexts: Record<number, string>;
  flashIndex: number | null;
  redactionMarks: Record<number, { left: number; width: number }[]>;
  shaking: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  paragraphRefs: React.RefObject<(HTMLDivElement | null)[]>;
  damageRef: React.RefObject<number>;
  onComplete: (d: number) => void;
  analysisSource: "ai" | "fallback";
}

function ClassifiedExperienceScreen({
  t, paragraphs, damageRatio, currentIndex, currentParagraph,
  hoveredIndex, setHoveredIndex, redactionMarks, shaking,
  containerRef, paragraphRefs, damageRef, onComplete, analysisSource,
}: ClassifiedExperienceProps) {
  const threatColor = damageRatio > 0.6 ? "#c41e3a" : damageRatio > 0.3 ? "#c48500" : "#4a4a4a";

  return (
    <div
      className={`experience-screen relative min-h-screen ${shaking ? "animate-shake" : ""}`}
      style={{ backgroundColor: "#f0ebe3" }}
    >
      {/* Paper texture */}
      <div className="paper-texture fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />
      {/* Coffee stain */}
      <div className="coffee-stain fixed pointer-events-none" style={{ width: 160, height: 120, top: "30%", left: "-30px", zIndex: 0 }} aria-hidden="true" />

      <div className="experience-layout relative z-10">

        {/* LEFT COLUMN — metadata */}
        <div
          className="hidden lg:flex flex-col justify-between p-6 border-r sticky top-0 h-screen overflow-hidden"
          style={{ borderColor: "rgba(26,26,26,0.15)" }}
        >
          <div>
            <p className="font-mono text-xs tracking-[0.3em] mb-4 text-[#4a4a4a] uppercase">File No. 03</p>

            <div className="mb-6">
              <p className="font-mono text-xs mb-1 text-[#4a4a4a] uppercase">{t.section}</p>
              <p className="font-mono text-4xl font-bold text-[#1a1a1a]">{String(currentIndex + 1).padStart(2, "0")}</p>
              <p className="font-mono text-xs text-[#4a4a4a]">/ {String(paragraphs.length).padStart(2, "0")}</p>
            </div>

            <div className="mb-6">
              <p className="font-mono text-xs mb-1 text-[#4a4a4a] uppercase">{t.category}</p>
              <p className="font-mono text-xs font-bold text-[#1a1a1a] uppercase border-l-2 border-[#c41e3a] pl-2">
                {t.categories[(currentParagraph?.category || "other") as keyof typeof t.categories]}
              </p>
            </div>

            <div className="mb-6">
              <p className="font-mono text-xs mb-1 text-[#4a4a4a] uppercase">{t.threatLevel}</p>
              <p className="font-mono text-2xl font-bold" style={{ color: threatColor }}>
                {Math.round(damageRatio * 100)}%
              </p>
              <div className="w-full h-2 mt-1 border border-[rgba(26,26,26,0.2)]" style={{ backgroundColor: "#e8e3db" }}>
                <div className="h-full transition-all duration-500" style={{ width: `${damageRatio * 100}%`, backgroundColor: threatColor }} />
              </div>
            </div>
          </div>

          {/* Vertical progress tick marks */}
          <div className="flex flex-col gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}
                className="h-1 transition-all duration-300"
                style={{
                  backgroundColor: i < Math.round((currentIndex / Math.max(paragraphs.length - 1, 1)) * 10)
                    ? "#1a1a1a"
                    : "rgba(26,26,26,0.15)",
                }}
              />
            ))}
            <p className="font-mono text-xs mt-1 text-[#4a4a4a] uppercase">{t.scroll}</p>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="flex-1 overflow-y-auto h-screen"
          style={{ scrollSnapType: "y proximity" }}
        >
          {/* Mobile HUD */}
          <div
            className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b lg:hidden"
            style={{ backgroundColor: "rgba(240,235,227,0.95)", borderColor: "rgba(26,26,26,0.15)", backdropFilter: "blur(8px)" }}
          >
            <span className="font-mono text-xs font-bold text-[#1a1a1a] uppercase">
              {t.threatLevel}: {Math.round(damageRatio * 100)}%
            </span>
          </div>

          {/* Header */}
          <div className="px-6 py-8 border-b" style={{ borderColor: "rgba(26,26,26,0.15)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs mb-1 text-[#4a4a4a] uppercase tracking-widest">{t.readingTerms.replace("> ", "")}</p>
                <p className="font-mono text-lg font-bold text-[#1a1a1a] uppercase">
                  {t.clausesDetected.replace("{count}", String(paragraphs.length))}
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-3">
                {analysisSource === "ai" && (
                  <span className="stamp stamp-dark text-xs px-2 py-0.5" style={{ fontSize: "0.6rem" }}>
                    {t.aiPowered}
                  </span>
                )}
                <span className="stamp stamp-red text-xs" style={{ fontSize: "0.65rem", transform: "rotate(-2deg)", display: "inline-block" }}>
                  {t.confidential}
                </span>
              </div>
            </div>
          </div>

          {/* Paragraphs */}
          <div className="px-6 py-8 space-y-4">
            {paragraphs.map((paragraph, idx) => {
              const severity = paragraph.severity;
              const isHovered = hoveredIndex === idx;
              const sc = CLASSIFIED_SEVERITY[severity] || CLASSIFIED_SEVERITY[1];
              const marks = redactionMarks[idx] || [];

              return (
                <div
                  key={idx}
                  ref={(el) => { paragraphRefs.current[idx] = el; }}
                  data-idx={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="relative transition-all duration-300"
                  style={{
                    backgroundColor: sc.bg,
                    padding: "1.25rem",
                    border: `1px solid ${sc.border}`,
                    boxShadow: severity >= 4 ? "0 2px 8px rgba(196,30,58,0.1), 2px 2px 0 rgba(26,26,26,0.06)" : "2px 2px 0 rgba(26,26,26,0.06)",
                    scrollSnapAlign: severity >= 4 ? "start" : "none",
                    cursor: severity >= 4 ? "not-allowed" : "help",
                  }}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-[#4a4a4a]">
                      {String(idx + 1).padStart(2, "0")} — {t.categories[paragraph.category as keyof typeof t.categories] || t.categories.other}
                    </span>
                    <span
                      className="font-mono text-xs font-bold px-1.5 py-0.5 border"
                      style={{ borderColor: sc.badge, color: sc.badge }}
                    >
                      SEV {severity}/5
                    </span>
                  </div>

                  {/* Severity 5: CLASSIFIED stamp over text */}
                  {severity === 5 && !isHovered && (
                    <div className="absolute top-2 right-2 z-10 pointer-events-none">
                      <span
                        className="stamp stamp-red text-xs"
                        style={{ fontSize: "0.55rem", transform: "rotate(4deg)", display: "inline-block" }}
                      >
                        {t.classifiedStamp}
                      </span>
                    </div>
                  )}

                  {/* Main text */}
                  <div className="relative">
                    <p
                      className="font-mono text-sm leading-relaxed text-[#1a1a1a]"
                      style={{ opacity: severity >= 5 && !isHovered ? 0.7 : 1 }}
                    >
                      {paragraph.text}
                    </p>

                    {/* Redaction marks for severity 4-5 */}
                    {severity >= 4 && marks.map((mark, mi) => (
                      <div
                        key={mi}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${mark.left}%`,
                          width: `${mark.width}%`,
                          top: `${20 + mi * 25}%`,
                          height: "1.3em",
                          background: "#1a1a1a",
                          opacity: 0.85,
                        }}
                      />
                    ))}
                  </div>

                  {/* Severity 4-5: red margin line */}
                  {severity >= 4 && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: sc.badge }}
                    />
                  )}

                  {/* Hover: analyst note overlay */}
                  {isHovered && (
                    <div
                      className="absolute inset-0 flex items-center justify-center z-20 p-6"
                      style={{ backgroundColor: "rgba(240,235,227,0.97)", border: `2px solid ${sc.border}` }}
                    >
                      <div className="max-w-md w-full">
                        <p className="font-mono text-xs uppercase tracking-widest mb-2 text-[#4a4a4a]">
                          {t.analystNote}
                        </p>
                        <p
                          className="font-mono text-sm leading-relaxed font-bold"
                          style={{ color: sc.badge || "#1a1a1a" }}
                        >
                          {paragraph.translation}
                        </p>
                        {(paragraph.matches ?? []).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {(paragraph.matches ?? []).map((match, mi) => (
                              <span
                                key={mi}
                                className="font-mono text-xs px-1.5 py-0.5 border border-[rgba(26,26,26,0.3)] text-[#4a4a4a]"
                              >
                                {match}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* End of document */}
            <div className="text-center py-16">
              <p className="font-mono text-xs uppercase tracking-widest mb-6 text-[#4a4a4a]">{t.endOfDocument}</p>
              <button
                onClick={() => onComplete(damageRef.current)}
                className="px-8 py-4 font-mono text-sm uppercase tracking-widest transition-all duration-300 cursor-pointer border-2 font-bold"
                style={{ borderColor: "#c41e3a", color: "#c41e3a", backgroundColor: "transparent" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#c41e3a"; e.currentTarget.style.color = "#ffffff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#c41e3a"; }}
              >
                {t.seeVerdict.replace(/[\[\]>]/g, "").trim()}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — translation sidebar */}
        <div
          className="hidden lg:flex flex-col p-6 border-l sticky top-0 h-screen overflow-hidden"
          style={{ borderColor: "rgba(26,26,26,0.15)" }}
        >
          <div>
            <p className="font-mono text-xs tracking-[0.2em] mb-4 text-[#4a4a4a] uppercase">{t.declassifiedLabel}</p>

            {currentParagraph ? (
              <div
                className="border p-4"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "rgba(26,26,26,0.2)",
                  boxShadow: "2px 2px 0 rgba(26,26,26,0.06)",
                }}
              >
                <p className="font-mono text-xs mb-2 text-[#4a4a4a] uppercase">
                  {t.threatLevel} — {currentParagraph.severity}/5
                </p>
                <div className="w-full h-1 mb-3 bg-[rgba(26,26,26,0.1)]">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(currentParagraph.severity / 5) * 100}%`,
                      backgroundColor: CLASSIFIED_SEVERITY[currentParagraph.severity]?.badge || "#4a4a4a",
                    }}
                  />
                </div>
                <p
                  className="font-mono text-sm leading-relaxed font-bold"
                  style={{ color: CLASSIFIED_SEVERITY[currentParagraph.severity]?.badge || "#1a1a1a" }}
                >
                  {currentParagraph.translation}
                </p>
                {(currentParagraph.matches ?? []).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(26,26,26,0.1)]">
                    <p className="font-mono text-xs mb-2 text-[#4a4a4a] uppercase">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {(currentParagraph.matches ?? []).map((match, mi) => (
                        <span key={mi} className="font-mono text-xs px-1.5 py-0.5 border border-[rgba(26,26,26,0.2)] text-[#4a4a4a]">
                          {match}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-[rgba(26,26,26,0.2)] p-4" style={{ backgroundColor: "#ffffff" }}>
                <p className="font-mono text-xs text-[#9a9a9a] uppercase">Hover a clause to reveal analyst notes</p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-[rgba(26,26,26,0.15)]">
            <span className="stamp stamp-red" style={{ fontSize: "0.6rem", display: "inline-block", transform: "rotate(-1deg)" }}>
              {t.doNotDistribute}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
