"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PROVIDERS = [
  { id: "fivesim", label: "5sim", hint: "5sim.net API key — current live provider" },
  { id: "herosms", label: "HeroSMS", hint: "hero-sms.com — better Facebook success" },
  { id: "smsman", label: "SMS-Man", hint: "sms-man.com API token" },
  { id: "grizzly", label: "GrizzlySMS", hint: "grizzlysms.com API key" },
  { id: "smspool", label: "SMSPool", hint: "smspool.net API key" },
  { id: "textverified", label: "TextVerified", hint: "textverified.com — US / high quality" },
];

export default function ProviderKeys({ headers }: { headers: any }) {
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>("");

  const load = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/providers/keys`, { headers });
      setSaved(res.data?.keys || {});
    } catch {
      setSaved({});
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (id: string) => {
    const raw = (draft[id] || "").trim();
    if (!raw || raw.startsWith("••••")) {
      alert("Paste a new API key first");
      return;
    }
    setBusy(id);
    try {
      await axios.post(`${API_URL}/api/admin/providers/keys`, { provider: id, api_key: raw }, { headers });
      setDraft((d) => ({ ...d, [id]: "" }));
      await load();
      alert(`${id} key saved`);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Save failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="card p-6">
      <h2 className="font-medium text-fg mb-1">Provider API Keys</h2>
      <p className="text-xs text-muted mb-5">Har provider ki key alag save karo. Activate/deactivate baad mein manually.</p>
      <div className="space-y-4">
        {PROVIDERS.map((p) => (
          <div key={p.id} className="panel p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm text-fg font-medium">{p.label}</p>
              <span className={`text-[10px] uppercase ${saved[p.id] ? "text-emerald-500" : "text-muted"}`}>
                {saved[p.id] ? "Saved" : "Empty"}
              </span>
            </div>
            <p className="text-[11px] text-muted mb-3">{p.hint}</p>
            {saved[p.id] && <p className="text-[11px] font-mono text-muted mb-2">{saved[p.id]}</p>}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={draft[p.id] || ""}
                onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                className="input-field flex-1 font-mono text-sm"
                placeholder={`Paste ${p.label} API key`}
                autoComplete="off"
              />
              <button type="button" disabled={busy === p.id} onClick={() => save(p.id)} className="btn-primary px-5 shrink-0">
                {busy === p.id ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
