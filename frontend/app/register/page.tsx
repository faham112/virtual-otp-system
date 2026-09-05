"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import GoogleButton from "../components/GoogleButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        username: form.username.trim().toLowerCase(),
        email: form.email.trim(),
        password: form.password,
      });
      router.push("/login");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(". "));
      else setError(typeof detail === "string" ? detail : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full card p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-fg">Create account</h1>
          <p className="text-muted text-sm mt-1">Start receiving OTPs in seconds</p>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-5 text-sm">{error}</div>}
        <div className="mb-5">
          <GoogleButton onError={setError} />
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Username</label>
            <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input-field" placeholder="min 3 characters" required minLength={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field pr-16" placeholder="Min 8 chars, 1 uppercase, 1 digit" required minLength={8} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs" tabIndex={-1}>{showPassword ? "Hide" : "Show"}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary py-3.5">{loading ? "Creating account..." : "Create Account"}</button>
        </form>
        <p className="text-center mt-7 text-sm text-muted">
          Already have an account? <Link href="/login" className="text-blue-500">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
