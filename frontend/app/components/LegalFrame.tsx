"use client";

import Link from "next/link";

export const LEGAL_PAGES = [
  { href: "/legal", label: "Overview", hint: "Where these pages live" },
  { href: "/terms", label: "Terms", hint: "Rules and no-refund policy" },
  { href: "/privacy", label: "Privacy", hint: "What data we keep" },
  { href: "/faq", label: "FAQ", hint: "Common questions" },
  { href: "/contact", label: "Contact", hint: "Send a WhatsApp query" },
];

export default function LegalFrame({
  current,
  title,
  updated,
  children,
}: {
  current: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
      <p className="text-[11px] text-muted">
        <Link href="/dashboard" className="hover:text-fg">Home</Link>
        <span className="px-1.5">/</span>
        <Link href="/legal" className="hover:text-fg">Pages</Link>
        <span className="px-1.5">/</span>
        <span className="text-fg">{title}</span>
      </p>
      <div className="mt-6 grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="card p-3 h-fit lg:sticky lg:top-24">
          <p className="px-2 pb-2 text-[11px] uppercase tracking-wide text-muted">Site pages</p>
          <nav className="space-y-0.5">
            {LEGAL_PAGES.map((p) => {
              const on = p.href === current;
              return (
                <Link
                  key={p.href}
                  href={p.href}
                  className={`block rounded-xl px-3 py-2.5 ${
                    on ? "bg-blue-600/15 text-blue-500" : "text-muted hover:text-fg hover:bg-soft"
                  }`}
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-[11px] opacity-80">{p.hint}</p>
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-fg">{title}</h1>
          {updated && <p className="text-sm text-muted mt-1">Last updated: {updated}</p>}
          <div className="mt-5">{children}</div>
        </section>
      </div>
    </main>
  );
}
