"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Props = {
  title: string;
};

const NAV = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/buy", label: "Buy", icon: BuyIcon },
  { href: "/deposit", label: "Deposit", icon: DepositIcon },
  { href: "/transactions", label: "History", icon: HistoryIcon },
];

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l9-8 9 8M5 10v10h14V10" />
    </svg>
  );
}
function BuyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
function DepositIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-2.2 0-4 1.3-4 3s1.8 3 4 3 4 1.3 4 3-1.8 3-4 3m0-12V5m0 14v-2" />
    </svg>
  );
}
function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

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
          <Link key={item.href} href={item.href} onClick={onPick} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? "bg-blue-600/20 text-blue-300" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"}`}>
            <Icon className="w-5 h-5" />
            {item.label}
          </Link>
        );
      })}
      {isAdmin && (
        <Link href="/admin" onClick={onPick} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive("/admin") ? "bg-purple-600/20 text-purple-300" : "text-purple-300/80 hover:text-purple-200 hover:bg-white/[0.04]"}`}>
          Admin
        </Link>
      )}
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-[#2a2f3d] bg-[#12151c]">
        <div className="px-5 py-5 border-b border-[#2a2f3d]">
          <p className="text-white font-semibold">Virtual OTP</p>
          <p className="text-xs text-gray-500 mt-1 truncate">{username || "Account"}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-[#2a2f3d]">
          <button type="button" onClick={logout} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10">Logout</button>
          <p className="px-3 pt-2 text-[10px] text-gray-600">© {new Date().getFullYear()} · Coded by Faham Baloch</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 bg-[#0f1117]/90 backdrop-blur-xl border-b border-[#2a2f3d]">
        <div className="px-4 py-3 grid grid-cols-3 items-center">
          <div className="justify-self-start">
            <button type="button" aria-label="Menu" onClick={() => setOpen(true)} className="lg:hidden w-10 h-10 rounded-xl border border-[#2a2f3d] bg-[#12151c] text-gray-200 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="hidden lg:inline text-sm text-gray-400">Workspace</span>
          </div>
          <h1 className="justify-self-center font-semibold text-white text-center truncate px-2 text-sm sm:text-base">{title}</h1>
          <div className="justify-self-end text-right">
            <p className="text-[10px] leading-none text-gray-500 mb-0.5">Balance</p>
            <p className="text-sm text-emerald-400 font-semibold">{balance !== null ? `$${balance.toFixed(2)}` : "..."}</p>
          </div>
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-[#12151c] border-r border-[#2a2f3d] flex flex-col">
            <div className="px-5 py-5 border-b border-[#2a2f3d] flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Virtual OTP</p>
                <p className="text-xs text-gray-500 mt-1">{username || "Account"}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">×</button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              <NavLinks onPick={() => setOpen(false)} />
            </nav>
            <div className="p-3 border-t border-[#2a2f3d]">
              <button type="button" onClick={logout} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10">Logout</button>
              <p className="px-3 pt-2 text-[10px] text-gray-600">Coded by Faham Baloch</p>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#2a2f3d] bg-[#12151c]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] ${active ? "text-blue-300" : "text-gray-500"}`}>
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
