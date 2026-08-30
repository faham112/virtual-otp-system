"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Bank = {
  key: string;
  name: string;
  details: string;
  type: string;
};

export default function DepositPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [amount, setAmount] = useState("");
  const [bankKey, setBankKey] = useState("");
  const [slipNote, setSlipNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [myDeposits, setMyDeposits] = useState<any[]>([]);
  const [balance, setBalance] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? Cookies.get("token") : null;

  const fetchBanks = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/deposits/banks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Backend returns { banks: [...] }
      const list: Bank[] = Array.isArray(res.data?.banks)
        ? res.data.banks
        : Array.isArray(res.data)
        ? res.data
        : [];
      setBanks(list);
      if (list.length && !bankKey) setBankKey(list[0].key);
    } catch {
      setBanks([]);
    }
  }, [token, bankKey]);

  const fetchMy = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/deposits/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyDeposits(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMyDeposits([]);
    }
  }, [token]);

  const fetchBalance = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(res.data?.balance ?? null);
    } catch {
      setBalance(null);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchBanks();
    fetchMy();
    fetchBalance();
  }, [token, router, fetchBanks, fetchMy, fetchBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/deposits/request`,
        {
          amount: parseFloat(amount),
          bank_key: bankKey,
          slip_note: slipNote,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Deposit request submitted. Admin will review and credit your balance.");
      setAmount("");
      setSlipNote("");
      fetchMy();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to submit deposit request");
    } finally {
      setLoading(false);
    }
  };

  const selectedBank = banks.find((b) => b.key === bankKey);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[#0f1117]/80 backdrop-blur-xl border-b border-[#2a2f3d]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="font-semibold text-white">Deposit</h1>
          <div className="text-sm text-emerald-400 font-medium">
            {balance !== null ? `$${balance.toFixed(2)}` : "..."}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-sm">{success}</div>
        )}

        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Request Deposit</h2>
          <p className="text-sm text-gray-400">
            Transfer to one of the banks below, then submit the amount + slip note. Admin will approve and credit your balance.
          </p>

          {banks.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3.5 rounded-xl text-sm">
              No banks configured yet. Ask admin to set bank details in Admin → Settings.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#12151c] border border-[#2a2f3d] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 10.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Bank</label>
                <select
                  value={bankKey}
                  onChange={(e) => setBankKey(e.target.value)}
                  className="w-full bg-[#12151c] border border-[#2a2f3d] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  {banks.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBank && (
                <div className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d] text-sm space-y-1">
                  <p className="text-gray-400">
                    Bank: <span className="text-white">{selectedBank.name}</span>
                  </p>
                  {selectedBank.details ? (
                    <pre className="text-white whitespace-pre-wrap font-mono text-xs mt-2 leading-relaxed">
                      {selectedBank.details}
                    </pre>
                  ) : (
                    <p className="text-amber-400 text-xs">Details not set — contact admin.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Slip / Transaction note</label>
                <textarea
                  value={slipNote}
                  onChange={(e) => setSlipNote(e.target.value)}
                  rows={3}
                  className="w-full bg-[#12151c] border border-[#2a2f3d] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Transaction ID / screenshot note / time of transfer"
                  required
                />
              </div>

              <button type="submit" disabled={loading || !bankKey} className="w-full btn-primary py-3">
                {loading ? "Submitting..." : "Submit Deposit Request"}
              </button>
            </form>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">My Deposit Requests</h2>
          {myDeposits.length === 0 ? (
            <p className="text-sm text-gray-500">No requests yet.</p>
          ) : (
            <div className="space-y-3">
              {myDeposits.map((d) => (
                <div key={d.id} className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d] text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">${Number(d.amount).toFixed(2)}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {d.bank_name || "Bank"} · {d.created_at ? new Date(d.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <span
                      className={`badge text-xs ${
                        d.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : d.status === "rejected"
                          ? "bg-red-500/15 text-red-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  {d.admin_note && <p className="text-gray-500 text-xs mt-2">Note: {d.admin_note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
