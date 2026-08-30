"use client";
import { useState } from "react";
import Link from "next/link";
import axios from "axios";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await axios.post(`${API_URL}/api/auth/forgot`, { email });
    setMsg(res.data.message || "If the email exists, admin can share the reset token from server logs.");
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full card p-8 space-y-4">
        <h1 className="text-xl font-bold text-white">Forgot password</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className="input-field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          <button className="btn-primary w-full">Request reset</button>
        </form>
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <Link href="/reset" className="text-sm text-blue-400">I already have a token</Link>
        <Link href="/login" className="block text-sm text-gray-500">Back to login</Link>
      </div>
    </div>
  );
}
