"use client";

import { useState, useCallback } from "react";
import InputScreen from "@/components/InputScreen";
import LoadingScreen from "@/components/LoadingScreen";
import ExperienceScreen from "@/components/ExperienceScreen";
import VerdictScreen from "@/components/VerdictScreen";
import BadTVOverlay from "@/components/BadTVOverlay";
import SettingsButton from "@/components/SettingsButton";
import type { AnalyzedParagraph } from "@/lib/types";

type Screen = "input" | "loading" | "experience" | "verdict";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("input");
  const [rawText, setRawText] = useState("");
  const [paragraphs, setParagraphs] = useState<AnalyzedParagraph[]>([]);
  const [totalDamage, setTotalDamage] = useState(0);
  const [currentDamage, setCurrentDamage] = useState(0); // Real-time damage for BadTV
  const [analysisSource, setAnalysisSource] = useState<"ai" | "fallback">("ai");
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  const handleDecode = useCallback((text: string) => {
    setInvalidReason(null);
    setRawText(text);
    setScreen("loading");
  }, []);

  const handleInvalid = useCallback((reason: string) => {
    setInvalidReason(reason);
    setScreen("input");
  }, []);

  // Called by LoadingScreen once the AI fetch resolves
  const handleLoadingComplete = useCallback(
    (analyzed: AnalyzedParagraph[], source: "ai" | "fallback") => {
      setParagraphs(analyzed);
      setAnalysisSource(source);
      setScreen("experience");
    },
    []
  );

  const handleExperienceComplete = useCallback((damage: number) => {
    setTotalDamage(damage);
    setScreen("verdict");
  }, []);

  const handleReset = useCallback(() => {
    setRawText("");
    setParagraphs([]);
    setTotalDamage(0);
    setCurrentDamage(0);
    setAnalysisSource("ai");
    setInvalidReason(null);
    setScreen("input");
  }, []);

  // Calculate damage for BadTV overlay based on current screen
  const getBadTVDamage = () => {
    if (screen === "input") return 8; // Ambient atmosphere
    if (screen === "loading") return 15;
    if (screen === "experience") {
      const maxDamage = paragraphs.length * 100;
      return maxDamage > 0 ? (currentDamage / maxDamage) * 100 : 0;
    }
    if (screen === "verdict") {
      return Math.min(totalDamage / 5, 100); // Scale down for verdict
    }
    return 0;
  };

  return (
    <main>
      <SettingsButton />
      <BadTVOverlay damage={getBadTVDamage()} />
      {screen === "input" && <InputScreen onDecode={handleDecode} invalidReason={invalidReason} />}
      {screen === "loading" && (
        <LoadingScreen
          text={rawText}
          onComplete={handleLoadingComplete}
          onInvalid={handleInvalid}
        />
      )}
      {screen === "experience" && (
        <ExperienceScreen
          paragraphs={paragraphs}
          onComplete={handleExperienceComplete}
          onDamageChange={setCurrentDamage}
          analysisSource={analysisSource}
        />
      )}
      {screen === "verdict" && (
        <VerdictScreen
          paragraphs={paragraphs}
          totalDamage={totalDamage}
          onReset={handleReset}
        />
      )}
    </main>
  );
}
