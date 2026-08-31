"use client";

import { useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProviderSwitch({ providers, onSaved, headers }: { providers: any; onSaved: () => void; headers: any }) {
  const [heroKey, setHeroKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  const activate = async (id: string) => {
    setSwitching(true);
    try {
      await axios.post(`${API_URL}/api/admin/providers/activate`, { id }, { headers });
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to switch API");
    } finally {
      setSwitching(false);
    }
  };

  const saveHero = async () => {
    const raw = heroKey.trim();
    if (!raw || raw.startsWith("••••")) {
      alert("Paste a new HeroSMS API key");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/admin/settings`, { herosms_api_key: raw }, { headers });
      setHeroKey("");
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save HeroSMS key");
    } finally {
      setSaving(false);
    }
  };

  const list = providers?.providers || [
    { id: "fivesim", label: "5sim (current wallet)", active: true },
    { id: "herosms", label: "HeroSMS (higher Facebook success)", active: false },
  ];

  return (
    <>
      <div className="card p-6">
        <h2 className="font-medium text-white mb-2">OTP Provider APIs</h2>
        <p className="text-xs text-gray-500 mb-4">Jo API ON hogi usi se number kharidega. Facebook ke liye HeroSMS ON karo.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((p: any) => (
            <button key={p.id} type="button" disabled={switching} onClick={() => activate(p.id)}
              className={`text-left rounded-xl border p-4 ${p.active ? "bg-emerald-600/15 border-emerald-500/40" : "bg-[#12151c] border-[#2a2f3d]"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white font-medium">{p.label}</span>
                <span className={`text-[10px] uppercase ${p.active ? "text-emerald-400" : "text-gray-500"}`}>{p.active ? "ON" : "OFF"}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Balance: {p.balance != null ? `$${Number(p.balance).toFixed(4)}` : "—"}</p>
              {p.error && <p className="text-[11px] text-amber-400 mt-1 truncate">{p.error}</p>}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">Active: <span className="text-white">{providers?.active || "fivesim"}</span></p>
      </div>
      <div className="card p-6">
        <h2 className="font-medium text-white mb-2">HeroSMS API Key</h2>
        <p className="text-xs text-gray-500 mb-3">hero-sms.com account → API key yahan save, phir HeroSMS card ON.</p>
        <div className="flex gap-3">
          <input type="text" value={heroKey} onChange={(e) => setHeroKey(e.target.value)} className="input-field flex-1 font-mono text-sm" placeholder="Paste HeroSMS API key" autoComplete="off" />
          <button onClick={saveHero} disabled={saving} className="btn-primary px-6">{saving ? "Saving..." : "Save Key"}</button>
        </div>
      </div>
    </>
  );
}
