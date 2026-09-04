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
      if (!ctx) return reject(new Error("Canvas failed"));
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
  const [pkr, setPkr] = useState("");
  const [rate, setRate] = useState<number>(0);
  const [bankKey, setBankKey] = useState("");
  const [slipPreview, setSlipPreview] = useState("");
  const [slipData, setSlipData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [myDeposits, setMyDeposits] = useState<any[]>([]);

  const token = typeof window !== "undefined" ? Cookies.get("token") : null;
  const pkrNum = parseFloat(pkr) || 0;
  const usd = rate > 0 && pkrNum > 0 ? pkrNum / rate : 0;

  const fetchFx = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/public/fx`);
      if (res.data?.rate) setRate(Number(res.data.rate));
    } catch {}
  }, []);

  const fetchBanks = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/deposits/banks`, { headers: { Authorization: `Bearer ${token}` } });
      const list: Bank[] = Array.isArray(res.data?.banks) ? res.data.banks : [];
      setBanks(list);
      setWhatsappNumbers(Array.isArray(res.data?.whatsapp_numbers) ? res.data.whatsapp_numbers : []);
      if (list.length && !bankKey) setBankKey(list[0].key);
    } catch { setBanks([]); }
  }, [token, bankKey]);

  const fetchMy = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/deposits/my`, { headers: { Authorization: `Bearer ${token}` } });
      setMyDeposits(Array.isArray(res.data) ? res.data : []);
    } catch { setMyDeposits([]); }
  }, [token]);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetchBanks(); fetchMy(); fetchFx();
    const id = setInterval(fetchFx, 60000);
    return () => clearInterval(id);
  }, [token, router, fetchBanks, fetchMy, fetchFx]);

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select a receipt image"); return; }
    try {
      const data = await fileToJpeg(file);
      setSlipData(data); setSlipPreview(data); setError("");
    } catch { setError("Could not read that image. Try another photo."); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!slipData) { setError("Select a receipt photo first"); return; }
    if (pkrNum <= 0) { setError("Enter the PKR amount you sent"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/deposits/request`, {
        pkr_amount: pkrNum, usd_amount: usd, fx_rate: rate, bank_key: bankKey, slip_image: slipData,
      }, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data || {};
      const url = data.proof_url || "";
      const msg = data.whatsapp_message || url;
      const numbers: string[] = data.whatsapp_numbers?.length ? data.whatsapp_numbers : whatsappNumbers;
      setProofUrl(url);
      setSuccess("Request saved. Opening WhatsApp with the receipt card.");
      setPkr(""); setSlipData(""); setSlipPreview(""); fetchMy();
      if (numbers[0]) openWhatsApp(numbers[0], msg);
      if (numbers[1]) setTimeout(() => openWhatsApp(numbers[1], msg), 700);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Deposit request failed");
    } finally { setLoading(false); }
  };

  const selectedBank = banks.find((b) => b.key === bankKey);

  return (
    <div className="min-h-screen">
      <AppHeader title="Deposit" />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm">{error}</div>}
        {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-sm">{success}</div>}
        {proofUrl && <div className="card p-4 text-sm"><a href={proofUrl} target="_blank" className="text-blue-400 break-all">{proofUrl}</a></div>}

        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">PKR deposit</h2>
          <p className="text-sm text-gray-400">Send PKR to the bank below. Live rate converts it to USDT for your wallet request.</p>
          {banks.length === 0 ? (
            <p className="text-amber-300 text-sm">No bank details yet. Ask the admin to add them in Settings.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Amount sent (PKR)</label>
                <input type="number" min="1" step="1" required value={pkr} onChange={(e) => setPkr(e.target.value)} className="input-field" placeholder="e.g. 1200" />
              </div>
              <div className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d]">
                <p className="text-xs text-gray-500">Live rate</p>
                <p className="text-white text-sm mt-1">{rate ? `1 USDT = ${rate.toFixed(2)} PKR` : "Loading rate..."}</p>
                <p className="text-emerald-400 text-xl font-bold mt-2">{usd > 0 ? `You get ${usd.toFixed(4)} USDT` : "Enter PKR amount"}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Bank</label>
                <select value={bankKey} onChange={(e) => setBankKey(e.target.value)} className="input-field" required>
                  {banks.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
                </select>
              </div>
              {selectedBank?.details && <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-[#12151c] p-3 rounded-xl border border-[#2a2f3d]">{selectedBank.details}</pre>}
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Select receipt from gallery</label>
                <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm text-gray-400" />
                {slipPreview && <img src={slipPreview} alt="Receipt" className="mt-3 w-full rounded-xl border border-[#2a2f3d]" />}
              </div>
              <button type="submit" disabled={loading || !bankKey || !slipData || usd <= 0} className="w-full btn-primary py-3">{loading ? "Submitting..." : "Submit receipt and WhatsApp"}</button>
            </form>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">My requests</h2>
          {myDeposits.length === 0 && <p className="text-sm text-gray-500">No deposit requests yet.</p>}
          {myDeposits.map((d) => (
            <div key={d.id} className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d] text-sm mb-3">
              <div className="flex justify-between">
                <div>
                  <p className="text-white font-medium">${Number(d.amount).toFixed(4)} USDT</p>
                  <p className="text-xs text-gray-500">{d.slip_note}</p>
                </div>
                <span className="text-xs text-amber-300">{d.status}</span>
              </div>
              {d.proof_url && <a href={d.proof_url} target="_blank" className="text-xs text-blue-400 mt-2 inline-block">Receipt card</a>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
