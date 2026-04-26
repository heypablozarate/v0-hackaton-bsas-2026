"use client";

import { useState } from "react";
import { CONTRACTS } from "@/lib/contracts";
import { useLanguage } from "@/contexts/LanguageContext";

interface InputScreenProps {
  onDecode: (text: string) => void;
  invalidReason?: string | null;
}

type InputMode = "card" | "url" | "text";

function isUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function InputScreen({ onDecode, invalidReason }: InputScreenProps) {
  const { t, theme } = useLanguage();
  const [customText, setCustomText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("card");
  const [urlStatus, setUrlStatus] = useState<"idle" | "loading" | "error">("idle");
  const [urlError, setUrlError] = useState("");

  async function fetchUrl(url: string) {
    setUrlStatus("loading");
    setUrlError("");
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch URL");
      const reconstructed = data.sections
        .map((sec: { title: string; content: string }) => `${sec.title}\n\n${sec.content}`)
        .join("\n\n---\n\n");
      setCustomText(reconstructed);
      setUrlStatus("idle");
      setInputMode("text");
    } catch (err) {
      setUrlStatus("error");
      setUrlError(err instanceof Error ? err.message : "Could not fetch that URL.");
    }
  }

  function handleUrlChange(value: string) {
    setUrlInput(value);
    setUrlError("");
    setUrlStatus("idle");
  }

  function handleUrlSubmit() {
    const trimmed = urlInput.trim();
    if (!isUrl(trimmed)) {
      setUrlStatus("error");
      setUrlError(t.errInvalidUrl);
      return;
    }
    fetchUrl(trimmed);
  }

  function handleTextareaChange(value: string) {
    setCustomText(value);
    setSelected(null);
    if (isUrl(value.trim())) {
      setUrlInput(value.trim());
      setCustomText("");
      setInputMode("url");
    } else {
      setInputMode("text");
    }
  }

  function handleDecode() {
    const text = selected
      ? CONTRACTS.find((c) => c.id === selected)?.text ?? ""
      : customText.trim();
    if (text.length < 50) return;
    onDecode(text);
  }

  const isReady = selected !== null || customText.trim().length >= 50;

  if (theme === "classified") {
    return <ClassifiedInputScreen
      t={t}
      customText={customText}
      urlInput={urlInput}
      selected={selected}
      inputMode={inputMode}
      urlStatus={urlStatus}
      urlError={urlError}
      isReady={isReady}
      invalidReason={invalidReason}
      onSelectContract={(id) => {
        setSelected(id === selected ? null : id);
        setCustomText("");
        setUrlInput("");
        setInputMode("card");
        setUrlStatus("idle");
        setUrlError("");
      }}
      onUrlChange={handleUrlChange}
      onUrlSubmit={handleUrlSubmit}
      onTextareaChange={handleTextareaChange}
      onDecode={handleDecode}
    />;
  }

  return (
    <div className="input-screen min-h-screen flex flex-col bg-black relative overflow-hidden">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />
      <div className="grain-overlay fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-screen">
        {/* Left column */}
        <div className="lg:col-span-5 flex flex-col justify-between p-8 lg:p-12 lg:border-r border-[rgba(0,255,65,0.2)]">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-[#004d1a] mb-6">
              PabloZarate&#8482; {t.presents}
            </p>
            <h1 className="font-pixel text-[3rem] sm:text-[4rem] lg:text-[5rem] xl:text-[6rem] leading-[0.85] tracking-tight text-[#00ff41] mb-4 crt-flicker text-glow-green">
              {t.title1}<br />{t.title2}<br />{t.title3}
            </h1>
            <p className="font-pixel text-xl lg:text-2xl text-[#004d1a] mb-8 tracking-wide">{t.subtitle}</p>
            <p className="font-mono text-xs text-[#00ff41] leading-relaxed mb-8 max-w-xs">
              {t.tagline1}<br />{t.tagline2}
            </p>
            <div className="font-mono text-xs text-[#00ff41] mb-2">{t.systemReady}</div>
            <div className="font-mono text-xs text-[#004d1a]">{t.selectTarget}</div>
          </div>
          <div className="hidden lg:block mt-12">
            <div className="font-mono text-xs text-[#004d1a] space-y-1">
              <p>{t.year}</p>
              <p>{t.genre}</p>
              <a href="https://pablozarate.com" target="_blank" rel="noopener noreferrer" className="text-[#00ff41] hover:text-white transition-colors duration-200">
                {t.withLove}<span className="text-[#f4340a]">&#8482;</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-7 flex flex-col p-8 lg:p-12">
          <div className="mb-10">
            <p className="font-mono text-xs tracking-[0.2em] text-[#004d1a] mb-4">{t.preloadedTargets}</p>
            <div className="grid grid-cols-2 gap-2">
              {CONTRACTS.map((contract, idx) => (
                <button
                  key={contract.id}
                  onClick={() => {
                    setSelected(contract.id === selected ? null : contract.id);
                    setCustomText(""); setUrlInput(""); setInputMode("card"); setUrlStatus("idle"); setUrlError("");
                  }}
                  className={`group relative flex flex-col items-start p-4 border text-left transition-all duration-200 cursor-pointer ${
                    selected === contract.id
                      ? "border-[#00ff41] bg-[rgba(0,255,65,0.05)]"
                      : "border-[rgba(0,255,65,0.2)] bg-transparent hover:border-[#00ff41] hover:bg-[rgba(0,255,65,0.02)]"
                  }`}
                >
                  <span className="font-mono text-xs text-[#004d1a] mb-1">{String(idx + 1).padStart(2, "0")} —</span>
                  <span className={`font-pixel text-sm leading-tight ${selected === contract.id ? "text-[#00ff41]" : "text-[#00cc33] group-hover:text-[#00ff41]"}`}>
                    {contract.name}
                  </span>
                  {selected === contract.id && <span className="absolute top-2 right-2 text-[#00ff41] font-mono text-xs">[*]</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-[rgba(0,255,65,0.2)]" />
            <span className="font-mono text-xs text-[#004d1a]">{t.orCustomInput}</span>
            <div className="flex-1 h-px bg-[rgba(0,255,65,0.2)]" />
          </div>

          <div className="mb-6">
            <p className="font-mono text-xs text-[#004d1a] mb-2">{t.enterUrl}</p>
            <div className="flex gap-2">
              <input
                type="url" value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); }}
                placeholder="https://example.com/terms"
                className={`flex-1 px-4 py-3 border bg-black text-[#00ff41] placeholder:text-[#004d1a] text-sm font-mono outline-none transition-colors duration-200 ${urlStatus === "error" ? "border-[#ff0040]" : urlInput && isUrl(urlInput) ? "border-[#00ff41]" : "border-[rgba(0,255,65,0.2)] focus:border-[#00ff41]"}`}
                disabled={urlStatus === "loading"}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={urlStatus === "loading" || !urlInput.trim()}
                className={`px-5 py-3 font-pixel text-xs transition-all duration-200 border ${urlStatus === "loading" || !urlInput.trim() ? "border-[#004d1a] text-[#004d1a] cursor-not-allowed" : "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black cursor-pointer"}`}
              >
                {urlStatus === "loading" ? "..." : t.fetch}
              </button>
            </div>
            {urlStatus === "error" && urlError && <p className="text-xs text-[#ff0040] mt-2 font-mono">{urlError}</p>}
            {inputMode === "text" && customText.length > 0 && urlInput && (
              <p className="text-xs text-[#00cc33] mt-2 font-mono">{t.fetchedChars.replace("{count}", customText.length.toLocaleString())}</p>
            )}
          </div>

          <div className="mb-8 flex-1">
            <p className="font-mono text-xs text-[#004d1a] mb-2">{t.pasteText}</p>
            <textarea
              value={customText} onChange={(e) => handleTextareaChange(e.target.value)} rows={8}
              placeholder={t.pastePlaceholder}
              className="w-full h-full min-h-[200px] px-4 py-4 border border-[rgba(0,255,65,0.2)] bg-black text-[#00ff41] placeholder:text-[#004d1a] text-sm leading-relaxed font-mono resize-none outline-none focus:border-[#00ff41] transition-colors duration-200"
            />
            {customText.trim().length > 0 && customText.trim().length < 50 && (
              <p className="text-xs text-[#004d1a] mt-2 font-mono">{t.minChars}</p>
            )}
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={handleDecode} disabled={!isReady}
              className={`px-8 py-4 font-pixel text-sm tracking-wide transition-all duration-300 border ${isReady ? "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black cursor-pointer" : "border-[#004d1a] text-[#004d1a] cursor-not-allowed"}`}
            >
              {t.decode}
            </button>
            <p className="font-mono text-xs text-[#004d1a]">{isReady ? t.readyToAnalyze : t.awaitingInput}</p>
          </div>

          {invalidReason && (
            <div className="mt-4 border border-[#ff0040] bg-[rgba(255,0,64,0.05)] p-4">
              <p className="font-pixel text-xs text-[#ff0040] mb-1">{t.errNotLegal}</p>
              <p className="font-mono text-xs text-[#ff0040] opacity-80">{invalidReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CLASSIFIED THEME ─────────────────────────────────────────────────────────

interface ClassifiedProps {
  t: ReturnType<typeof useLanguage>["t"];
  customText: string;
  urlInput: string;
  selected: string | null;
  inputMode: InputMode;
  urlStatus: "idle" | "loading" | "error";
  urlError: string;
  isReady: boolean;
  invalidReason?: string | null;
  onSelectContract: (id: string) => void;
  onUrlChange: (v: string) => void;
  onUrlSubmit: () => void;
  onTextareaChange: (v: string) => void;
  onDecode: () => void;
}

function ClassifiedInputScreen({
  t, customText, urlInput, selected, inputMode, urlStatus, urlError,
  isReady, invalidReason, onSelectContract, onUrlChange, onUrlSubmit,
  onTextareaChange, onDecode,
}: ClassifiedProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: "#f0ebe3", cursor: "default" }}>
      {/* Paper texture */}
      <div className="paper-texture fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />

      {/* Coffee stain decorations */}
      <div className="coffee-stain fixed pointer-events-none" style={{ width: 180, height: 140, top: "15%", left: "-40px", zIndex: 0 }} aria-hidden="true" />
      <div className="coffee-stain fixed pointer-events-none" style={{ width: 100, height: 80, bottom: "20%", right: "5%", zIndex: 0 }} aria-hidden="true" />

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-screen">
        {/* Left column */}
        <div className="lg:col-span-5 flex flex-col justify-between p-8 lg:p-12 lg:border-r border-[rgba(26,26,26,0.15)]">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-[#4a4a4a] mb-6">
              PabloZarate&#8482; {t.presents}
            </p>

            {/* Main title */}
            <h1 className="font-pixel text-[3rem] sm:text-[4rem] lg:text-[5rem] xl:text-[5.5rem] leading-[0.9] tracking-[0.05em] text-[#1a1a1a] mb-3">
              {t.title1}<br />{t.title2}<br />{t.title3}
            </h1>

            {/* Classified stamp below title */}
            <div className="mb-6 mt-4">
              <span
                className="stamp stamp-red inline-block text-xs font-mono tracking-[0.2em]"
                style={{ transform: "rotate(-2deg)", display: "inline-block" }}
              >
                {t.awaitingDeclassification}
              </span>
            </div>

            <p className="font-mono text-xs text-[#4a4a4a] leading-relaxed mb-8 max-w-xs">
              {t.tagline1}<br />{t.tagline2}
            </p>

            <div className="font-mono text-xs text-[#1a1a1a] mb-2 border-l-2 border-[#c41e3a] pl-3">
              {t.systemReady.replace(">", "").trim()} — {t.selectTarget.replace(">", "").trim()}
            </div>
          </div>

          <div className="hidden lg:block mt-12">
            <div className="font-mono text-xs text-[#4a4a4a] space-y-1 border-t border-[rgba(26,26,26,0.15)] pt-4">
              <p>{t.year}</p>
              <p>{t.genre}</p>
              <a href="https://pablozarate.com" target="_blank" rel="noopener noreferrer"
                className="text-[#1a1a1a] hover:text-[#c41e3a] transition-colors duration-200">
                {t.withLove}<span className="text-[#c41e3a]">&#8482;</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-7 flex flex-col p-8 lg:p-12">
          {/* Contract cards */}
          <div className="mb-10">
            <p className="font-mono text-xs tracking-[0.2em] text-[#4a4a4a] mb-4 uppercase">
              {t.preloadedTargets}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CONTRACTS.map((contract, idx) => (
                <button
                  key={contract.id}
                  onClick={() => onSelectContract(contract.id)}
                  className="group relative flex flex-col items-start p-4 text-left transition-all duration-200 cursor-pointer"
                  style={{
                    backgroundColor: "#ffffff",
                    border: selected === contract.id ? "2px solid #e8c500" : "1px solid rgba(26,26,26,0.2)",
                    boxShadow: selected === contract.id
                      ? "0 2px 8px rgba(232,197,0,0.3), 2px 2px 0 rgba(26,26,26,0.1)"
                      : "2px 2px 0 rgba(26,26,26,0.08)",
                  }}
                >
                  <span className="font-mono text-xs text-[#4a4a4a] mb-1">
                    {t.fileNo} {String(idx + 1).padStart(2, "0")} —
                  </span>
                  <span className={`font-mono text-sm font-bold leading-tight uppercase tracking-wide ${
                    selected === contract.id ? "text-[#1a1a1a]" : "text-[#4a4a4a] group-hover:text-[#1a1a1a]"
                  }`}>
                    {contract.name}
                  </span>
                  {selected === contract.id && (
                    <span className="absolute top-2 right-2 font-mono text-xs text-[#c41e3a] font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-[rgba(26,26,26,0.2)]" />
            <span className="font-mono text-xs text-[#4a4a4a]">{t.orCustomInput}</span>
            <div className="flex-1 h-px bg-[rgba(26,26,26,0.2)]" />
          </div>

          {/* URL input */}
          <div className="mb-6">
            <p className="font-mono text-xs text-[#4a4a4a] mb-2 uppercase tracking-widest">{t.enterUrl.replace(">", "").trim()}</p>
            <div className="flex gap-2">
              <input
                type="url" value={urlInput}
                onChange={(e) => onUrlChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onUrlSubmit(); }}
                placeholder="https://example.com/terms"
                className={`flex-1 px-4 py-3 font-mono text-sm text-[#1a1a1a] placeholder:text-[#4a4a4a] outline-none transition-colors duration-200 ${
                  urlStatus === "error"
                    ? "border-2 border-[#c41e3a]"
                    : urlInput && isUrl(urlInput)
                    ? "border-2 border-[#1a1a1a]"
                    : "border border-[rgba(26,26,26,0.3)] focus:border-[#1a1a1a]"
                }`}
                style={{ backgroundColor: "#faf8f4" }}
                disabled={urlStatus === "loading"}
              />
              <button
                onClick={onUrlSubmit}
                disabled={urlStatus === "loading" || !urlInput.trim()}
                className="px-5 py-3 font-mono text-xs uppercase tracking-widest transition-all duration-200 border"
                style={{
                  backgroundColor: urlStatus === "loading" || !urlInput.trim() ? "transparent" : "#ffffff",
                  borderColor: urlStatus === "loading" || !urlInput.trim() ? "rgba(26,26,26,0.2)" : "#1a1a1a",
                  color: urlStatus === "loading" || !urlInput.trim() ? "#4a4a4a" : "#1a1a1a",
                  cursor: urlStatus === "loading" || !urlInput.trim() ? "not-allowed" : "pointer",
                }}
              >
                {urlStatus === "loading" ? "..." : t.fetch.replace(/[\[\]]/g, "")}
              </button>
            </div>
            {urlStatus === "error" && urlError && <p className="text-xs text-[#c41e3a] mt-2 font-mono">{urlError}</p>}
            {inputMode === "text" && customText.length > 0 && urlInput && (
              <p className="text-xs text-[#4a4a4a] mt-2 font-mono">{t.fetchedChars.replace("{count}", customText.length.toLocaleString())}</p>
            )}
          </div>

          {/* Textarea */}
          <div className="mb-8 flex-1">
            <p className="font-mono text-xs text-[#4a4a4a] mb-2 uppercase tracking-widest">{t.pasteText.replace(">", "").trim()}</p>
            <textarea
              value={customText}
              onChange={(e) => onTextareaChange(e.target.value)}
              rows={8}
              placeholder={t.pastePlaceholder.replace(">", "").trim()}
              className="w-full h-full min-h-[200px] px-4 py-4 font-mono text-sm text-[#1a1a1a] placeholder:text-[#9a9a9a] leading-relaxed resize-none outline-none transition-colors duration-200 border focus:border-[#1a1a1a]"
              style={{ backgroundColor: "#faf8f4", borderColor: "rgba(26,26,26,0.25)" }}
            />
            {customText.trim().length > 0 && customText.trim().length < 50 && (
              <p className="text-xs text-[#c41e3a] mt-2 font-mono">{t.minChars}</p>
            )}
          </div>

          {/* Declassify button */}
          <div className="flex items-center gap-6">
            <button
              onClick={onDecode}
              disabled={!isReady}
              className="px-8 py-4 font-mono text-sm tracking-widest uppercase transition-all duration-300 border-2 font-bold"
              style={{
                borderColor: isReady ? "#c41e3a" : "rgba(26,26,26,0.2)",
                color: isReady ? "#c41e3a" : "#9a9a9a",
                backgroundColor: "transparent",
                cursor: isReady ? "pointer" : "not-allowed",
              }}
              onMouseEnter={(e) => {
                if (isReady) {
                  e.currentTarget.style.backgroundColor = "#c41e3a";
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = isReady ? "#c41e3a" : "#9a9a9a";
              }}
            >
              {t.declassify.replace(/[\[\]]/g, "")}
            </button>
            <p className="font-mono text-xs text-[#4a4a4a]">
              {isReady ? t.readyToAnalyze : t.awaitingInput}
            </p>
          </div>

          {invalidReason && (
            <div className="mt-4 border-2 border-[#c41e3a] p-4" style={{ backgroundColor: "rgba(196,30,58,0.05)" }}>
              <p className="font-mono text-xs text-[#c41e3a] mb-1 font-bold uppercase tracking-widest">{t.errNotLegal}</p>
              <p className="font-mono text-xs text-[#c41e3a] opacity-80">{invalidReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
