"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/forgot`, { email: email.trim().toLowerCase() });
      setMsg(res.data.message || "Check your email for the 6-digit code.");
      setStep(2);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setErr(typeof detail === "string" ? detail : "Could not send email");
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset`, {
        email: email.trim().toLowerCase(),
        code,
        new_password: password,
      });
      setMsg(res.data.message || "Password updated. You can sign in now.");
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setErr(typeof detail === "string" ? detail : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full card p-6 sm:p-8 space-y-4">
        <h1 className="text-xl font-bold text-fg">Reset password</h1>
        {step === 1 ? (
          <>
            <p className="text-sm text-muted">Enter the email on your account. We will send a 6-digit code.</p>
            <form onSubmit={sendCode} className="space-y-4">
              <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
              <button className="btn-primary w-full" disabled={loading}>{loading ? "Sending..." : "Send code to email"}</button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Enter the code sent to {email} and choose a new password.</p>
            <form onSubmit={reset} className="space-y-4">
              <input className="input-field font-mono tracking-widest" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required minLength={6} />
              <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" required minLength={8} />
              <button className="btn-primary w-full" disabled={loading}>{loading ? "Updating..." : "Update password"}</button>
            </form>
            <button type="button" className="text-sm text-muted" onClick={() => { setStep(1); setErr(""); }}>Send a new code</button>
          </>
        )}
        {msg && <p className="text-sm text-emerald-500">{msg}</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <Link href="/login" className="block text-sm text-blue-500">Back to login</Link>
      </div>
    </div>
  );
}
