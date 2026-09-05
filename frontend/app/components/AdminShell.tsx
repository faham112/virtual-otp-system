"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Wallet,
  Settings2,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ADMIN_NAV = [
  { href: "/admin", label: "Control Panel", Icon: LayoutDashboard },
  { href: "/admin/deposits", label: "Deposits", Icon: Wallet },
  { href: "/admin/settings", label: "USD + HeroSMS", Icon: Settings2 },
  { href: "/admin/providers", label: "API Keys", Icon: KeyRound },
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
    axios
      .get(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.data?.is_admin) router.push("/dashboard");
        setUsername(res.data?.username || "Admin");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const logout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  const Nav = ({ onPick }: { onPick?: () => void }) => (
    <>
      {ADMIN_NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.Icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onPick}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active
                ? "bg-violet-600/15 text-violet-500"
                : "text-muted hover:text-fg hover:bg-soft/50"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
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
          <p className="text-[11px] uppercase tracking-[0.18em] text-violet-500 font-medium">Control</p>
          <p className="text-fg font-semibold mt-1">Admin Panel</p>
          <p className="text-xs text-muted mt-1 truncate">{username}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <Nav />
        </nav>
        <div className="p-3 space-y-1 border-t border-line">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-fg hover:bg-soft/50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open user app
          </Link>
          <button
            type="button"
            onClick={logout}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
          <p className="px-3 pt-2 text-[10px] text-muted">Virtual OTP · v2.3</p>
        </div>
      </aside>

      <header className="app-header lg:pl-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden icon-btn"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-fg font-medium truncate">Admin</p>
            <p className="text-[11px] text-muted truncate lg:hidden">{username}</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] app-aside p-3 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-2 py-2 mb-1">
              <div>
                <p className="text-fg font-semibold">Admin Panel</p>
                <p className="text-xs text-muted">{username}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              <Nav onPick={() => setOpen(false)} />
            </nav>
            <div className="space-y-1 border-t border-line pt-2">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-muted"
              >
                <ExternalLink className="w-4 h-4" /> Open user app
              </Link>
              <button
                type="button"
                onClick={logout}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-3 sm:px-4 pb-8 overflow-x-hidden">{children}</div>
    </>
  );
}
