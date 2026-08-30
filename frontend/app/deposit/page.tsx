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

function cleanPhone(n: string) {
  return String(n || "").replace(/[^\d]/g, "");
}

function openWhatsApp(phone: string, message: string) {
  const num = cleanPhone(phone);
  if (!num) return false;
  const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
  return true;
}

export default function DepositPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>([]);
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
      const list: Bank[] = Array.isArray(res.data?.banks)
        ? res.data.banks
        : Array.isArray(res.data)
        ? res.data
        : [];
      setBanks(list);
      const wa = Array.isArray(res.data?.whatsapp_numbers) ? res.data.whatsapp_numbers : [];
      setWhatsappNumbers(wa);
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
      const res = await axios.post(
        `${API_URL}/api/deposits/request`,
        {
          amount: parseFloat(amount),
          bank_key: bankKey,
          slip_note: slipNote,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data || {};
      const bankName = data.bank_name || banks.find((b) => b.key === bankKey)?.name || bankKey;
      const amt = data.amount ?? parseFloat(amount);
      const username = data.username || "user";
      const depositId = data.deposit_id;
      const numbers: string[] =
        Array.isArray(data.whatsapp_numbers) && data.whatsapp_numbers.length
          ? data.whatsapp_numbers
          : whatsappNumbers;

      const msg =
        `Assalam o Alaikum Admin,\n\n` +
        `Maine deposit request submit ki hai.\n\n` +
        `👤 User: ${username}\n` +
        `💰 Amount: $${Number(amt).toFixed(2)}\n` +
        `🏦 Bank: ${bankName}\n` +
        `📝 Slip/Note: ${slipNote || "—"}\n` +
        `🆔 Request ID: #${depositId}\n\n` +
        `Receipt / screenshot is message ke sath attach kar raha/rahi hoon. ` +
        `Please verify karke mera balance credit kar dein. Shukriya.`;

      setSuccess(
        "Request submit ho gayi. Ab WhatsApp open hoga — receipt bhej dein. Admin balance credit karega."
      );
      setAmount("");
      setSlipNote("");
      fetchMy();

      if (numbers.length === 0) {
        setError(
          "Admin WhatsApp number set nahi hai. Request save ho gayi — Admin panel se number set karein."
        );
      } else {
        openWhatsApp(numbers[0], msg);
        if (numbers[1]) {
          setTimeout(() => openWhatsApp(numbers[1], msg), 800);
        }
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Deposit request fail ho gayi");
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
          <h2 className="text-lg font-semibold text-white">Deposit Request</h2>
          <p className="text-sm text-gray-400">
            Bank transfer karke amount + slip note submit karein. Submit ke baad WhatsApp open hoga — admin ko receipt bhej dein.
          </p>

          {banks.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3.5 rounded-xl text-sm">
              Abhi koi bank set nahi. Admin se bank details set karwayein (Admin → Settings).
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
                    <p className="text-amber-400 text-xs">Details set nahi — admin se poochhein.</p>
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
                  placeholder="Transaction ID / time / screenshot note"
                  required
                />
              </div>

              <button type="submit" disabled={loading || !bankKey} className="w-full btn-primary py-3">
                {loading ? "Submitting..." : "Submit & WhatsApp pe bhejein"}
              </button>

              {whatsappNumbers.length > 0 && (
                <p className="text-xs text-center text-gray-500">
                  Admin WhatsApp set hai ({whatsappNumbers.length}). Submit ke baad chat open hogi.
                </p>
              )}
            </form>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Meray Deposit Requests</h2>
          {myDeposits.length === 0 ? (
            <p className="text-sm text-gray-500">Abhi koi request nahi.</p>
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
