"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "otp-theme";

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("theme-light", theme === "light");
  root.classList.toggle("theme-dark", theme === "dark");
  root.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
}

export default function ThemeToggle() {
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

  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="icon-btn shrink-0"
      aria-pressed={theme === "light"}
    >
      <Icon aria-hidden="true" className="w-4 h-4" strokeWidth={2.2} />
    </button>
  );
}
