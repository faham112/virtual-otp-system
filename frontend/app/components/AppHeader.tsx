"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import {
  Menu,
  X,
  Home,
  Smartphone,
  Wallet,
  History,
  Shield,
  LogOut,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Props = {
  title: string;
};

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/buy", label: "Buy", icon: Smartphone },
  { href: "/deposit", label: "Deposit", icon: Wallet },
  { href: "/transactions", label: "History", icon: History },
];

export default function AppHeader({ title }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("otp-shell");
    return () => document.body.classList.remove("otp-shell");
  }, []);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;
    axios
      .get(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setBalance(typeof res.data?.balance === "number" ? res.data.balance : null);
        setIsAdmin(!!res.data?.is_admin);
        setUsername(res.data?.username || "");
      })
      .catch(() => setBalance(null));
  }, []);

  const logout = () => {
    Cookies.remove("token");
    setOpen(false);
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const NavLinks = ({ onPick }: { onPick?: () => void }) => (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onPick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              active ? "bg-blue-600/15 text-blue-500" : "text-muted hover:text-fg hover:bg-soft"
            }`}
          >
            <Icon className="w-5 h-5" />
            {item.label}
          </Link>
        );
      })}
      {isAdmin && (
        <Link
          href="/admin"
          onClick={onPick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
            isActive("/admin") ? "bg-violet-600/15 text-violet-500" : "text-violet-500"
          }`}
        >
          <Shield className="w-5 h-5" />
          Admin
        </Link>
      )}
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col app-aside">
        <div className="px-5 py-5 border-b border-line">
          <p className="text-fg font-semibold">Virtual OTP</p>
          <p className="text-xs text-muted mt-1 truncate">{username || "Account"}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-line space-y-2">
          <button type="button" onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400">
            <LogOut className="w-4 h-4" /> Logout
          </button>
          <p className="px-3 pt-2 text-[10px] text-muted">© {new Date().getFullYear()} · Coded by Faham Baloch</p>
        </div>
      </aside>

      <header className="app-header">
        <div className="px-4 py-3 flex items-center gap-3">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="lg:hidden icon-btn">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center lg:text-left font-semibold text-fg truncate text-sm sm:text-base">{title}</h1>
          <ThemeToggle />
          <div className="text-right min-w-[4.5rem]">
            <p className="text-[10px] leading-none text-muted mb-0.5">Balance</p>
            <p className="text-sm text-emerald-500 font-semibold">{balance !== null ? `$${balance.toFixed(2)}` : "..."}</p>
          </div>
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] app-aside flex flex-col">
            <div className="px-5 py-5 border-b border-line flex items-center justify-between">
              <div>
                <p className="text-fg font-semibold">Virtual OTP</p>
                <p className="text-xs text-muted mt-1">{username || "Account"}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="icon-btn" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              <NavLinks onPick={() => setOpen(false)} />
            </nav>
            <div className="p-3 border-t border-line space-y-2">
              <ThemeToggle />
              <button type="button" onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 app-nav pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] ${active ? "text-blue-500" : "text-muted"}`}>
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
