"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AccountPage() {
  const router = useRouter();
  const [hasCode, setHasCode] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
    axios.get(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setHasCode(Boolean(res.data.has_recovery_code)))
      .catch(() => router.push("/login"));
  }, [router]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    const token = Cookies.get("token");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/recovery-code`, { code }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasCode(true);
      setCode("");
      setMsg("Recovery code saved. Store it offline. It is the only way to reset a forgotten password.");
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setErr(typeof detail === "string" ? detail : "Could not save code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <div className="card p-6 space-y-4">
        <h1 className="text-lg font-semibold text-fg">Recovery code</h1>
        <p className="text-sm text-muted">
          {hasCode
            ? "A recovery code is already set. Saving a new one replaces the old code."
            : "Set a private code now. If you forget your password, this code lets you reset it yourself."}
        </p>
        <form onSubmit={save} className="space-y-3">
          <input
            className="input-field font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Example: BLUE7TREE"
            minLength={6}
            required
          />
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Saving..." : "Save recovery code"}</button>
        </form>
        {msg && <p className="text-sm text-emerald-500">{msg}</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
      </div>
    </main>
  );
}
