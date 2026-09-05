"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminSettingsPage() {
  const headers = () => ({ Authorization: `Bearer ${Cookies.get("token")}` });
  const [markup, setMarkup] = useState("0.035");
  const [heroKey, setHeroKey] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const s = await axios.get(`${API_URL}/api/admin/settings`, { headers: headers() });
      const data = s.data || {};
      if (data.markup_usd) setMarkup(String(data.markup_usd));
      if (data.herosms_api_key) setHeroKey("••••••••" + String(data.herosms_api_key).slice(-4));
    } catch {}
    try {
      const b = await axios.get(`${API_URL}/api/admin/provider-balance`, { headers: headers() });
      setBalance(typeof b.data?.balance === "number" ? b.data.balance : null);
      setProvider(b.data?.provider || "herosms");
    } catch {
      setBalance(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveMarkup = async () => {
    const val = parseFloat(markup);
    if (isNaN(val) || val < 0 || val > 100) {
      alert("Enter USD profit, e.g. 0.035");
      return;
    }
    setBusy("markup");
    try {
      await axios.post(`${API_URL}/api/admin/set-markup`, { markup_usd: val }, { headers: headers() });
      setMsg(`Profit saved: $${val.toFixed(4)} per number`);
      await load();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const saveHero = async () => {
    const raw = heroKey.trim();
    if (!raw || raw.startsWith("•")) {
      alert("Paste HeroSMS API key");
      return;
    }
    setBusy("hero");
    try {
      await axios.post(
        `${API_URL}/api/admin/settings`,
        { herosms_api_key: raw, active_provider: "herosms" },
        { headers: headers() }
      );
      setMsg("HeroSMS key saved — live provider on");
      setHeroKey("");
      await load();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Save failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-violet-500 font-medium">Admin</p>
        <h1 className="text-xl font-semibold text-fg mt-1">Pricing & HeroSMS</h1>
      </div>
      {msg && <p className="text-sm text-emerald-500">{msg}</p>}

      <div className="card p-6">
        <h2 className="font-medium text-fg mb-2">Profit per number (USD)</h2>
        <p className="text-xs text-muted mb-4">Sell price = HeroSMS cost + this dollar amount. Example 0.035</p>
        <div className="flex gap-3">
          <input
            type="number"
            min="0"
            max="100"
            step="0.001"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            className="input-field flex-1"
            placeholder="0.035"
          />
          <button type="button" onClick={saveMarkup} disabled={busy === "markup"} className="btn-primary px-6 shrink-0">
            {busy === "markup" ? "Saving..." : "Save"}
          </button>
        </div>
        <p className="text-xs text-muted mt-3">
          Current add-on: <span className="text-fg">${markup}</span>
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-medium text-fg mb-2">HeroSMS wallet</h2>
        <p className="text-3xl font-bold text-fg mt-3">{balance !== null ? `$${balance.toFixed(4)}` : "—"}</p>
        <p className="text-xs text-muted mt-2">Active provider: {provider || "herosms"}</p>
        <p className="text-xs text-amber-500 mt-2">Dash dikhe to key save karo, phir page refresh.</p>
      </div>

      <div className="card p-6">
        <h2 className="font-medium text-fg mb-2">HeroSMS API key</h2>
        <p className="text-xs text-muted mb-3">
          hero-sms.com se key paste karo. Save ke baad yahi live OTP provider ban jati hai.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={heroKey}
            onChange={(e) => setHeroKey(e.target.value)}
            onFocus={() => {
              if (heroKey.startsWith("•")) setHeroKey("");
            }}
            className="input-field flex-1 font-mono text-sm"
            placeholder="Paste HeroSMS API key"
            autoComplete="off"
          />
          <button type="button" onClick={saveHero} disabled={busy === "hero"} className="btn-primary px-6 shrink-0">
            {busy === "hero" ? "Saving..." : "Save Key"}
          </button>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted">Virtual OTP · v2.3</p>
    </main>
  );
}
