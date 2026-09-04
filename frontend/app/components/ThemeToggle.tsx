"use client";

import { useEffect, useState } from "react";

const KEY = "otp-theme";

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("theme-light", theme === "light");
  root.classList.toggle("theme-dark", theme === "dark");
  root.setAttribute("data-theme", theme);
  try { localStorage.setItem(KEY, theme); } catch {}
}

export default function ThemeToggle({ compact = true }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem(KEY)) || "dark";
    const next = saved === "light" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light" : "Dark"}
      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium theme-toggle"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
