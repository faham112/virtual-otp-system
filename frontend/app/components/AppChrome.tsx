"use client";

import { usePathname } from "next/navigation";
import PublicHeader from "./PublicHeader";
import SiteFooter from "./SiteFooter";

const APP_PREFIXES = ["/dashboard", "/buy", "/deposit", "/transactions", "/account", "/admin"];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const isApp = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <div className="min-h-screen flex flex-col">
      {!isApp && <PublicHeader />}
      <div className="flex-1 min-w-0">{children}</div>
      <SiteFooter />
    </div>
  );
}
