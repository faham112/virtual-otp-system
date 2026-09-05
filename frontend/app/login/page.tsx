"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";
import GoogleButton from "../components/GoogleButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("username", username.trim().toLowerCase());
      params.append("password", password);
      const res = await axios.post(`${API_URL}/api/auth/login`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      Cookies.set("token", res.data.access_token, { expires: 7, sameSite: "lax" });
      router.push(res.data.is_admin ? "/admin" : "/dashboard");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full card p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-fg">Welcome back</h1>
          <p className="text-muted text-sm mt-1">Sign in to your account</p>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-5 text-sm">{error}</div>}
        <div className="mb-5">
          <GoogleButton onError={setError} />
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-field" placeholder="your_username" required autoComplete="username" />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pr-12" placeholder="••••••••" required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" tabIndex={-1}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Signing in..." : "Sign in"}</button>
        </form>
        <p className="text-center text-sm text-muted mt-6">
          <Link href="/forgot" className="text-blue-500">Forgot password?</Link>
        </p>
        <p className="text-center text-sm text-muted mt-3">
          No account? <Link href="/register" className="text-blue-500">Register</Link>
        </p>
      </div>
    </div>
  );
}
