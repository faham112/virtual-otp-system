"use client";
import { useState } from "react";
import Link from "next/link";
import axios from "axios";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export default function ResetPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await axios.post(`${API_URL}/api/auth/reset`, { token, password });
      setMsg(res.data.message);
    } catch (e: any) {
      setErr(e.response?.data?.detail || "Reset failed");
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full card p-8 space-y-4">
        <h1 className="text-xl font-bold text-white">Reset password</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className="input-field" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Reset token" required />
          <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" required minLength={8} />
          <button className="btn-primary w-full">Update password</button>
        </form>
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <Link href="/login" className="text-sm text-gray-500">Back to login</Link>
      </div>
    </div>
  );
}
