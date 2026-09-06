"use client";

import Link from "next/link";
import LegalFrame from "../components/LegalFrame";

const PAGES = [
  { href: "/terms", label: "Terms", hint: "Rules and no-refund policy" },
  { href: "/privacy", label: "Privacy", hint: "What data we keep" },
  { href: "/faq", label: "FAQ", hint: "Common questions" },
  { href: "/contact", label: "Contact", hint: "Send a WhatsApp query" },
];

export default function LegalIndexPage() {
  return (
    <LegalFrame current="/legal" title="Site pages">
      <div className="card p-5 sm:p-6 space-y-4">
        <p className="text-sm text-muted">
          These pages sit under Pages in the sidebar (below Logout) and in the footer.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href} className="panel p-4 hover:border-blue-500/40 transition">
              <p className="text-fg font-medium">{p.label}</p>
              <p className="text-xs text-muted mt-1">{p.hint}</p>
              <p className="text-[11px] text-blue-500 mt-2">{p.href}</p>
            </Link>
          ))}
        </div>
      </div>
    </LegalFrame>
  );
}
