"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import LegalFrame from "../components/LegalFrame";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    axios.get(`${API_URL}/api/public/contact`).then((res) => {
      if (res.data?.whatsapp) setPhone(String(res.data.whatsapp).replace(/\D/g, ""));
    }).catch(() => {});
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!phone) {
      setErr("WhatsApp is not configured yet. Ask admin to save a number in Settings.");
      return;
    }
    const text =
      `Hello Virtual OTP support,\n\n` +
      `Name: ${name.trim()}\n` +
      `Email: ${email.trim()}\n\n` +
      `Query:\n${query.trim()}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <LegalFrame current="/contact" title="Contact us">
      <p className="text-sm text-muted mb-4">Write your query and submit. WhatsApp opens with the message ready to send.</p>
      <form onSubmit={submit} className="card p-5 sm:p-6 space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1.5">Name</label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1.5">Email</label>
          <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1.5">Query</label>
          <textarea className="input-field min-h-32" value={query} onChange={(e) => setQuery(e.target.value)} required />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" className="btn-primary w-full py-3">Submit on WhatsApp</button>
      </form>
    </LegalFrame>
  );
}
