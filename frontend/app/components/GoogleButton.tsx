"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleButton({ onError }: { onError: (msg: string) => void }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_URL}/api/auth/google-config`).then((res) => {
      if (!cancelled) setClientId(res.data?.client_id || "");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    const existing = document.getElementById("google-gsi");
    if (existing) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = "google-gsi";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, [clientId]);

  const start = () => {
    if (!clientId) {
      onError("Google login is not configured yet");
      return;
    }
    if (!window.google?.accounts?.id) {
      onError("Google script is still loading");
      return;
    }
    setBusy(true);
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp: any) => {
        try {
          const res = await axios.post(`${API_URL}/api/auth/google`, { id_token: resp.credential });
          Cookies.set("token", res.data.access_token, { expires: 7, sameSite: "lax" });
          router.push(res.data.is_admin ? "/admin" : "/dashboard");
        } catch (e: any) {
          const detail = e.response?.data?.detail;
          onError(typeof detail === "string" ? detail : "Google sign-in failed");
          setBusy(false);
        }
      },
    });
    window.google.accounts.id.prompt((n: any) => {
      if (n?.isNotDisplayed?.() || n?.isSkippedMoment?.()) {
        const btn = document.getElementById("google-hidden-btn");
        if (btn) window.google.accounts.id.renderButton(btn, { theme: "outline", size: "large", width: 320 });
        setBusy(false);
      }
    });
  };

  if (!clientId) return null;

  return (
    <div className="space-y-3">
      <button type="button" onClick={start} disabled={!ready || busy} className="w-full border border-line rounded-xl py-3 text-sm font-medium text-fg flex items-center justify-center gap-2 hover:bg-soft">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.7 7.5l6.3 5.3C37.8 38.3 44 33 44 24c0-1.3-.1-2.5-.4-3.5z"/>
        </svg>
        {busy ? "Connecting..." : "Continue with Google"}
      </button>
      <div id="google-hidden-btn" className="flex justify-center" />
      <div className="flex items-center gap-3 text-[11px] text-muted">
        <span className="flex-1 h-px bg-[color:var(--border)]" />
        or
        <span className="flex-1 h-px bg-[color:var(--border)]" />
      </div>
    </div>
  );
}
