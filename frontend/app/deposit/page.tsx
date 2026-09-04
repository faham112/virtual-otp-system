"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Bank = { key: string; name: string; details: string; type: string };

function cleanPhone(n: string) {
  return String(n || "").replace(/[^\d]/g, "");
}

function openWhatsApp(phone: string, message: string) {
  const num = cleanPhone(phone);
  if (!num) return false;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, "_blank");
  return true;
}

function fileToJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas failed"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => reject(new Error("Image read failed"));
    img.src = url;
  });
}

export default function DepositPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [bankKey, setBankKey] = useState("");
  const [slipNote, setSlipNote] = useState("");
  const [slipPreview, setSlipPreview] = useState("");
  const [slipData, setSlipData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [myDeposits, setMyDeposits] = useState<any[]>([]);

  const token = typeof window !== "undefined" ? Cookies.get("token") : null;

  const fetchBanks = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/deposits/banks`, { headers: { Authorization: `Bearer ${token}` } });
      const list: Bank[] = Array.isArray(res.data?.banks) ? res.data.banks : [];
      setBanks(list);
      setWhatsappNumbers(Array.isArray(res.data?.whatsapp_numbers) ? res.data.whatsapp_numbers : []);
      if (list.length && !bankKey) setBankKey(list[0].key);
    } catch {
      setBanks([]);
    }
  }, [token, bankKey]);

  const fetchMy = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/deposits/my`, { headers: { Authorization: `Bearer ${token}` } });
      setMyDeposits(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMyDeposits([]);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchBanks();
    fetchMy();
  }, [token, router, fetchBanks, fetchMy]);

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Sirf receipt image upload karein (JPG/PNG)");
      return;
    }
    try {
      const data = await fileToJpeg(file);
      setSlipData(data);
      setSlipPreview(data);
      setError("");
    } catch {
      setError("Receipt read nahi hui. Dusri photo try karein.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!slipData) {
      setError("Pehle payment receipt upload karein");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/deposits/request`,
        { amount: parseFloat(amount), bank_key: bankKey, slip_note: slipNote, slip_image: slipData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data || {};
      const url = data.proof_url || "";
      const msg = data.whatsapp_message || `USD deposit $${Number(data.amount).toFixed(2)}\n${url}`;
      const numbers: string[] = Array.isArray(data.whatsapp_numbers) && data.whatsapp_numbers.length ? data.whatsapp_numbers : whatsappNumbers;
      setProofUrl(url);
      setSuccess("Request save ho gayi. WhatsApp pe receipt card bhej rahe hain.");
      setAmount("");
      setSlipNote("");
      setSlipData("");
      setSlipPreview("");
      fetchMy();
      if (numbers.length === 0) {
        setError("Admin WhatsApp set nahi. Link copy karke khud bhej dein.");
      } else {
        openWhatsApp(numbers[0], msg);
        if (numbers[1]) setTimeout(() => openWhatsApp(numbers[1], msg), 700);
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
      <AppHeader title="Deposit" />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm">{error}</div>}
        {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-sm">{success}</div>}
        {proofUrl && (
          <div className="card p-4 text-sm">
            <p className="text-gray-400 mb-1">Receipt card link</p>
            <a href={proofUrl} target="_blank" className="text-blue-400 break-all">{proofUrl}</a>
          </div>
        )}

        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">USD Deposit</h2>
          <p className="text-sm text-gray-400">Amount dollars mein likho, receipt photo lagao. Submit ke baad WhatsApp pe admin ko card + link chala jata hai.</p>

          {banks.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3.5 rounded-xl text-sm">Bank details admin ne set nahi kiye.</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount (USD)</label>
                <input type="number" step="0.01" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field" placeholder="e.g. 10.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Bank</label>
                <select value={bankKey} onChange={(e) => setBankKey(e.target.value)} className="input-field" required>
                  {banks.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
                </select>
              </div>
              {selectedBank && (
                <div className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d] text-sm">
                  <p className="text-white">{selectedBank.name}</p>
                  {selectedBank.details ? <pre className="text-gray-300 whitespace-pre-wrap font-mono text-xs mt-2">{selectedBank.details}</pre> : null}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Receipt photo</label>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm text-gray-400" />
                {slipPreview && <img src={slipPreview} alt="Receipt preview" className="mt-3 w-full rounded-xl border border-[#2a2f3d]" />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Optional note</label>
                <textarea value={slipNote} onChange={(e) => setSlipNote(e.target.value)} rows={2} className="input-field" placeholder="Txn ID / time (optional)" />
              </div>
              <button type="submit" disabled={loading || !bankKey || !slipData} className="w-full btn-primary py-3">
                {loading ? "Submitting..." : "Submit receipt + WhatsApp"}
              </button>
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
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-white font-medium">${Number(d.amount).toFixed(2)} USD</p>
                      <p className="text-gray-400 text-xs mt-0.5">{d.bank_name} · {d.created_at ? new Date(d.created_at).toLocaleString() : ""}</p>
                    </div>
                    <span className={`badge ${d.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : d.status === "rejected" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>{d.status}</span>
                  </div>
                  {d.proof_url && <a href={d.proof_url} target="_blank" className="text-xs text-blue-400 mt-2 inline-block">Open receipt card</a>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
