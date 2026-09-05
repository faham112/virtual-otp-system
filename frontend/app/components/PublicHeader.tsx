"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function PublicHeader() {
  return (
    <header className="app-header">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="font-semibold text-fg truncate">Virtual OTP</Link>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
          <Link href="/register" className="btn-primary text-sm py-2 px-4">Get started</Link>
        </div>
      </div>
    </header>
  );
}
