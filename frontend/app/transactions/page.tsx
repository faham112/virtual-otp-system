"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
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
        return "text-emerald-500";
      case "refund":
        return "text-blue-500";
      case "debit":
        return "text-red-400";
      default:
        return "text-muted";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted text-sm">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Transactions" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="card overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-line flex justify-between items-center gap-3">
            <h2 className="font-medium text-fg">Wallet History</h2>
            <span className="text-xs text-muted">{txns.length} records</span>
          </div>

          {txns.length === 0 ? (
            <div className="p-12 text-center text-muted text-sm">No transactions yet</div>
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {txns.map((t) => (
                <div key={t.id} className="px-5 sm:px-6 py-4 flex justify-between items-start gap-4 hover:bg-soft/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-fg">{t.description || t.type}</p>
                    <p className="text-xs text-muted mt-1">
                      {new Date(t.created_at).toLocaleString()} · {t.type}
                    </p>
                  </div>
                  <p className={`font-mono font-semibold shrink-0 ${typeColor(t.type)}`}>
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
