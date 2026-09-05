"use client";

import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import ProviderKeys from "../ProviderKeys";

export default function AdminProvidersPage() {
  const router = useRouter();
  const token = Cookies.get("token");
  useEffect(() => {
    if (!token) router.push("/login");
  }, [token, router]);
  const headers = { Authorization: `Bearer ${token}` };
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-violet-500 font-medium">Admin</p>
          <h1 className="text-fg font-semibold mt-0.5">Provider APIs</h1>
        </div>
        <Link href="/admin" className="text-sm text-muted hover:text-fg">
          ← Admin
        </Link>
      </div>
      <ProviderKeys headers={headers} />
      <p className="text-center text-[11px] text-muted pt-2">Virtual OTP · v2.3</p>
    </div>
  );
}
