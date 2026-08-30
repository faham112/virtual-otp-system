"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Props = {
  title: string;
  showBack?: boolean;
  backHref?: string;
};

export default function AppHeader({ title, showBack = true, backHref = "/dashboard" }: Props) {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;
    axios
      .get(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setBalance(typeof res.data?.balance === "number" ? res.data.balance : null);
        setIsAdmin(!!res.data?.is_admin);
      })
      .catch(() => setBalance(null));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const logout = () => {
    Cookies.remove("token");
    setOpen(false);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0f1117]/80 backdrop-blur-xl border-b border-[#2a2f3d]">
      <div className="max-w-4xl mx-auto px-4 py-4 grid grid-cols-3 items-center">
        <div className="justify-self-start">
          {showBack ? (
            <Link href={backHref} className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
          ) : (
            <span className="text-sm font-semibold text-white">Virtual OTP</span>
          )}
        </div>

        <h1 className="justify-self-center font-semibold text-white text-center truncate px-2">{title}</h1>

        <div className="justify-self-end flex items-center gap-3" ref={menuRef}>
          <div className="text-right">
            <p className="text-[10px] leading-none text-gray-500 mb-0.5">Balance</p>
            <p className="text-sm text-emerald-400 font-medium">
              {balance !== null ? `$${balance.toFixed(2)}` : "..."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="w-9 h-9 rounded-xl border border-[#2a2f3d] bg-[#12151c] text-gray-200 hover:text-white hover:border-[#3a4055] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {open && (
            <div className="absolute right-4 top-[3.6rem] w-52 rounded-2xl border border-[#2a2f3d] bg-[#12151c] shadow-xl overflow-hidden">
              <Link href="/dashboard" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.04]">
                Dashboard
              </Link>
              <Link href="/buy" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.04]">
                Buy Number
              </Link>
              <Link href="/deposit" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.04]">
                Deposit
              </Link>
              <Link href="/transactions" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.04]">
                Transactions
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-purple-300 hover:bg-white/[0.04]">
                  Admin Panel
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 border-t border-[#2a2f3d]"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
