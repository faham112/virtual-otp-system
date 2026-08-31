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
      <div className="flex items-center justify-between">
        <h1 className="text-white font-medium">Provider APIs</h1>
        <Link href="/admin" className="text-sm text-gray-400">← Admin</Link>
      </div>
      <ProviderKeys headers={headers} />
    </div>
  );
}
