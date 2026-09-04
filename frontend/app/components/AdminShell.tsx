"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ADMIN_NAV = [
  { href: "/admin", label: "Control Panel" },
  { href: "/admin/deposits", label: "Deposits" },
  { href: "/admin/settings", label: "USD + HeroSMS" },
  { href: "/admin/providers", label: "API Keys" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("admin-shell");
    document.body.classList.remove("otp-shell");
    return () => document.body.classList.remove("admin-shell");
  }, []);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;
    axios.get(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.data?.is_admin) router.push("/dashboard");
        setUsername(res.data?.username || "Admin");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const logout = () => { Cookies.remove("token"); router.push("/login"); };

  const Nav = ({ onPick }: { onPick?: () => void }) => (
    <>
      {ADMIN_NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onPick} className={`block px-3 py-2.5 rounded-xl text-sm font-medium ${active ? "bg-violet-600/25 text-violet-200" : "text-slate-400 hover:text-white hover:bg-white/[0.04]"}`}>
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-violet-500/20 bg-[#0b0c12]">
        <div className="px-5 py-5 border-b border-violet-500/20">
          <p className="text-[11px] uppercase tracking-[0.18em] text-violet-400">Control</p>
          <p className="text-white font-semibold mt-1">Admin Panel</p>
          <p className="text-xs text-slate-500 mt-1 truncate">{username}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto"><Nav /></nav>
        <div className="p-3 space-y-1 border-t border-violet-500/20">
          <Link href="/dashboard" className="block px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white">Open user app</Link>
          <button type="button" onClick={logout} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10">Logout</button>
          <p className="px-3 pt-2 text-[10px] text-slate-600">© {new Date().getFullYear()} · Coded by Faham Baloch</p>
        </div>
      </aside>
      <header className="sticky top-0 z-30 border-b border-violet-500/20 bg-[#0b0c12]/95 backdrop-blur-xl">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <button type="button" className="lg:hidden w-10 h-10 rounded-xl border border-violet-500/30 text-violet-200" onClick={() => setOpen(true)}>☰</button>
          <span className="text-sm text-white font-medium">Admin</span>
          <Link href="/admin/deposits" className="text-xs text-violet-300">Deposits</Link>
        </div>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-[#0b0c12] border-r border-violet-500/20 p-3 flex flex-col">
            <p className="px-3 py-3 text-white font-semibold">Admin Panel</p>
            <nav className="flex-1 space-y-1"><Nav onPick={() => setOpen(false)} /></nav>
            <button type="button" onClick={logout} className="text-left px-3 py-2.5 text-sm text-red-400">Logout</button>
          </div>
        </div>
      )}
      <div className="px-3 sm:px-4 overflow-x-hidden">{children}</div>
    </>
  );
}
