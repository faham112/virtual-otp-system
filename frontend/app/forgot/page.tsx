"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPage() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/forgot`, {
        username: username.trim().toLowerCase(),
        recovery_code: code,
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
        <p className="text-sm text-muted">
          Use the custom recovery code you saved in your account. If you never set one, ask admin to assign a code.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
          <input className="input-field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Recovery code" required minLength={6} />
          <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" required minLength={8} />
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Updating..." : "Update password"}</button>
        </form>
        {msg && <p className="text-sm text-emerald-500">{msg}</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <Link href="/login" className="block text-sm text-blue-500">Back to login</Link>
      </div>
    </div>
  );
}
