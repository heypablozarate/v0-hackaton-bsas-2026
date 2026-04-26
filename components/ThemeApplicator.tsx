"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ThemeApplicator() {
  const { theme } = useLanguage();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.cursor = theme === "classified" ? "default" : "crosshair";
    if (theme === "classified") {
      document.documentElement.classList.remove("bg-black");
    } else {
      document.documentElement.classList.add("bg-black");
    }
  }, [theme]);

  return null;
}
