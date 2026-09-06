"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Stats = {
  ok?: boolean;
  site?: string;
  users?: number;
  completed_otps?: number;
  pending_otps?: number;
  countries?: number;
  services?: number;
  recent?: { service: string; country: string; at?: string }[];
};

const STEPS = [
  { n: "1", t: "Create account", d: "Accept the Terms, register, then sign in." },
  { n: "2", t: "Add wallet balance", d: "Open Deposit, choose a bank, send PKR and upload the receipt. After admin approval, USDT appears in your wallet." },
  { n: "3", t: "Buy with Better quality", d: "Buy opens on Better quality by default so Facebook codes are more likely to arrive. Switch to Cheaper only if you accept more failures." },
  { n: "4", t: "Receive OTP", d: "Copy the number into the app. The code appears here automatically." },
];

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/public/stats`, { timeout: 8000 });
        if (live) setStats(res.data || {});
      } catch {
        if (live) setStats({ ok: false, users: 0, completed_otps: 0, countries: 150, services: 15, recent: [] });
      }
    };
    load();
    const id = setInterval(load, 20000);
    return () => { live = false; clearInterval(id); };
  }, []);

  return (
    <main>
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-8 sm:pt-16">
        <p className="text-xs uppercase tracking-[0.16em] text-blue-500 mb-3">Live virtual numbers</p>
        <h1 className="text-3xl sm:text-5xl font-bold text-fg leading-tight max-w-3xl">
          Temporary numbers for Facebook, WhatsApp and more
        </h1>
        <p className="mt-4 text-muted max-w-2xl text-sm sm:text-base leading-relaxed">
          Buy a number from your wallet and receive the OTP on this dashboard.
          New orders use Better quality by default.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href="/register" className="btn-primary text-center py-3 px-6">Create free account</Link>
          <Link href="/terms" className="text-center py-3 px-6 rounded-xl border border-line text-fg">Refund policy / Terms</Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Users" value={stats?.users} />
          <Stat label="OTPs delivered" value={stats?.completed_otps} />
          <Stat label="Countries" value={stats?.countries} />
          <Stat label="Services" value={stats?.services} />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-10 grid md:grid-cols-2 gap-4">
        <div className="card p-5 sm:p-6">
          <h2 className="text-fg font-semibold mb-4">How to use</h2>
          <ol className="space-y-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-600/15 text-blue-500 text-sm flex items-center justify-center shrink-0">{s.n}</span>
                <div>
                  <p className="text-sm text-fg font-medium">{s.t}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="card p-5 sm:p-6">
          <h2 className="text-fg font-semibold mb-4">Recent deliveries</h2>
          {!stats?.recent?.length ? (
            <p className="text-sm text-muted">Waiting for the first completed OTP...</p>
          ) : (
            <ul className="space-y-2">
              {stats.recent.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm border border-line rounded-xl px-3 py-2">
                  <span className="text-fg capitalize truncate">{r.service}</span>
                  <span className="text-muted capitalize truncate">{r.country}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-14">
        <div className="card p-5 sm:p-6 space-y-3">
          <h2 className="text-fg font-semibold">No refund policy</h2>
          <p className="text-sm text-muted leading-relaxed">
            Deposits and OTP purchases are final. We do not send money back to the bank or USDT wallet.
            If Facebook rejects a number, that is an app block — not a site refund.
            Better quality is the default because cheap numbers fail more often.
          </p>
          <Link href="/terms" className="text-sm text-blue-500 inline-block">Read full Terms and Conditions</Link>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-fg mt-1">{typeof value === "number" ? value.toLocaleString() : "—"}</p>
    </div>
  );
}
