"use client";

import { useState } from "react";
import { useLanguage, type Theme } from "@/contexts/LanguageContext";

export default function SettingsButton() {
  const { language, setLanguage, theme, setTheme, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const isClassified = theme === "classified";

  const btnBg = isClassified ? "#f0ebe3" : "#000000";
  const btnBorder = isClassified ? "rgba(26,26,26,0.3)" : "rgba(0,255,65,0.3)";
  const btnBorderHover = isClassified ? "#1a1a1a" : "#00ff41";
  const iconStroke = isClassified ? "#1a1a1a" : "#00ff41";
  const panelBg = isClassified ? "#f4efe7" : "#000000";
  const panelBorder = isClassified ? "rgba(26,26,26,0.25)" : "rgba(0,255,65,0.3)";
  const labelColor = isClassified ? "#1a1a1a" : "#00ff41";
  const dividerColor = isClassified ? "rgba(26,26,26,0.15)" : "rgba(0,255,65,0.15)";
  const aboutTextColor = isClassified ? "#3a3a3a" : "#004d1a";
  const linkColor = isClassified ? "#c41e3a" : "#00ff41";

  const labelFont = isClassified ? "font-typewriter tracking-widest" : "font-pixel";
  const bodyFont = isClassified ? "font-typewriter" : "font-mono";

  const activeBtn = isClassified
    ? "border-[#1a1a1a] text-[#1a1a1a] bg-[rgba(26,26,26,0.08)]"
    : "border-[#00ff41] text-[#00ff41] bg-[rgba(0,255,65,0.05)]";
  const inactiveBtn = isClassified
    ? "border-[rgba(26,26,26,0.2)] text-[#4a4a4a] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
    : "border-[rgba(0,255,65,0.2)] text-[#004d1a] hover:border-[#00ff41] hover:text-[#00ff41]";

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center border transition-colors duration-200"
        style={{ background: btnBg, borderColor: btnBorder }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = btnBorderHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = btnBorder; }}
        aria-label={t.settings}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute top-12 right-0 z-50 border p-4 w-[230px] max-h-[80vh] overflow-y-auto"
            style={{ background: panelBg, borderColor: panelBorder }}
          >
            {/* Language section */}
            <p className={`${labelFont} text-xs mb-3`} style={{ color: labelColor }}>{t.language}</p>
            <div className="space-y-2 mb-5">
              {(["en", "es"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 ${bodyFont} text-xs transition-colors duration-200 border ${
                    language === lang ? activeBtn : inactiveBtn
                  }`}
                >
                  {language === lang ? "[*] " : "[ ] "}{lang === "en" ? t.english : t.spanish}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="mb-4" style={{ borderTop: `1px solid ${dividerColor}` }} />

            {/* Theme section */}
            <p className={`${labelFont} text-xs mb-3`} style={{ color: labelColor }}>{t.theme}</p>
            <div className="space-y-2 mb-5">
              {(["terminal", "classified"] as Theme[]).map((th) => (
                <button
                  key={th}
                  onClick={() => { setTheme(th); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 ${bodyFont} text-xs transition-colors duration-200 border ${
                    theme === th ? activeBtn : inactiveBtn
                  }`}
                >
                  {theme === th ? "[*] " : "[ ] "}{th === "terminal" ? t.themeTerminal : t.themeClassified}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="mb-4" style={{ borderTop: `1px solid ${dividerColor}` }} />

            {/* About section */}
            <p className={`${labelFont} text-xs mb-3`} style={{ color: labelColor }}>{t.aboutTitle}</p>
            <div className="space-y-2" style={{ color: aboutTextColor }}>
              <p className={`${bodyFont} text-xs leading-relaxed`}>{t.aboutP1}</p>
              <p className={`${bodyFont} text-xs leading-relaxed`}>{t.aboutP2}</p>
              <p className={`${bodyFont} text-xs leading-relaxed`}>{t.aboutP3}</p>
              <p className={`${bodyFont} text-xs leading-relaxed`}>
                {t.aboutMadeBy}{" "}
                <a
                  href="https://pablozarate.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                  style={{ color: linkColor }}
                >
                  PabloZarate&#8482;
                </a>{" "}
                {t.aboutBuiltWith}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
