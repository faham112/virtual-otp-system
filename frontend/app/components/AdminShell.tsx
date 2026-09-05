"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import { Menu, X, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

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
          <Link key={item.href} href={item.href} onClick={onPick} className={`block px-3 py-2.5 rounded-xl text-sm font-medium ${active ? "bg-violet-600/15 text-violet-500" : "text-muted hover:text-fg"}`}>
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col app-aside">
        <div className="px-5 py-5 border-b border-line">
          <p className="text-[11px] uppercase tracking-[0.18em] text-violet-500">Control</p>
          <p className="text-fg font-semibold mt-1">Admin Panel</p>
          <p className="text-xs text-muted mt-1 truncate">{username}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto"><Nav /></nav>
        <div className="p-3 space-y-1 border-t border-line">
          <Link href="/dashboard" className="block px-3 py-2.5 rounded-xl text-sm text-muted hover:text-fg">Open user app</Link>
          <button type="button" onClick={logout} className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <header className="app-header">
        <div className="px-4 py-3 flex items-center gap-3">
          <button type="button" className="lg:hidden icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <span className="flex-1 text-sm text-fg font-medium">Admin</span>
          <ThemeToggle />
        </div>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] app-aside p-3 flex flex-col">
            <div className="flex items-center justify-between px-2 py-2">
              <p className="text-fg font-semibold">Admin Panel</p>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-1"><Nav onPick={() => setOpen(false)} /></nav>
            <button type="button" onClick={logout} className="text-left flex items-center gap-2 px-3 py-2.5 text-sm text-red-400">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      )}
      <div className="px-3 sm:px-4 overflow-x-hidden">{children}</div>
    </>
  );
}
