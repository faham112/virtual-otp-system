"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TransactionsPage() {
  const router = useRouter();
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/api/users/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTxns(res.data);
    } catch {
      Cookies.remove("token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const typeColor = (type: string) => {
    switch (type) {
      case "credit":
        return "text-emerald-400";
      case "refund":
        return "text-blue-400";
      case "debit":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[#0f1117]/80 backdrop-blur-xl border-b border-[#2a2f3d]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5">
            ← Dashboard
          </Link>
          <h1 className="font-semibold text-white">Transactions</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2a2f3d] flex justify-between">
            <h2 className="font-medium text-white">Wallet History</h2>
            <span className="text-xs text-gray-500">{txns.length} records</span>
          </div>

          {txns.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No transactions yet</div>
          ) : (
            <div className="divide-y divide-[#2a2f3d]">
              {txns.map((t) => (
                <div key={t.id} className="px-6 py-4 flex justify-between items-start gap-4">
                  <div>
                    <p className="text-sm text-gray-200">{t.description || t.type}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(t.created_at).toLocaleString()} · {t.type}
                    </p>
                  </div>
                  <p className={`font-mono font-semibold ${typeColor(t.type)}`}>
                    {t.amount >= 0 ? "+" : ""}
                    ${Math.abs(t.amount).toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
