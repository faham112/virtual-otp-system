"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";
import { countryFlag, countryLabel } from "../lib/countries";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SERVICES = [
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "google", label: "Google" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter / X" },
  { value: "tiktok", label: "TikTok" },
  { value: "discord", label: "Discord" },
  { value: "microsoft", label: "Microsoft" },
  { value: "amazon", label: "Amazon" },
];

function rowPrice(row: any): number {
  const n = Number(row?.user_price ?? row?.price ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatUsd(n: number): string {
  if (!n || n <= 0) return "";
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

export default function BuyPage() {
  const router = useRouter();
  const [service, setService] = useState("whatsapp");
  const [country, setCountry] = useState("any");
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [stockRows, setStockRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<"phone" | "otp" | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sortedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = stockRows.filter((r) => {
      if (!q) return true;
      const label = countryLabel(r.country).toLowerCase();
      return String(r.country).includes(q) || label.includes(q);
    });
    return [...rows].sort((a, b) => {
      const ap = rowPrice(a);
      const bp = rowPrice(b);
      if (ap > 0 && bp <= 0) return -1;
      if (bp > 0 && ap <= 0) return 1;
      if (ap !== bp) return ap - bp;
      const aOk = !!a.available;
      const bOk = !!b.available;
      if (aOk !== bOk) return aOk ? -1 : 1;
      return countryLabel(a.country).localeCompare(countryLabel(b.country));
    });
  }, [stockRows, search]);

  const cheapestLive = useMemo(() => {
    const live = stockRows.filter((r) => r.available && rowPrice(r) > 0);
    if (!live.length) return null;
    return [...live].sort((a, b) => rowPrice(a) - rowPrice(b))[0];
  }, [stockRows]);

  const fetchStock = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) return;
    setStockLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/catalog/stock`, {
        params: { service },
        headers: { Authorization: `Bearer ${token}` },
      });
      setStockRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setStockRows([]);
    } finally {
      setStockLoading(false);
    }
  }, [service]);

  const fetchPrice = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) return;
    setPriceLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/catalog/price`, {
        params: { service, country },
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuote(res.data);
      if (res.data && res.data.available === false) {
        setError("Out of stock - stock available nahi.");
      } else {
        setError("");
      }
    } catch {
      setQuote(null);
    } finally {
      setPriceLoading(false);
    }
  }, [service, country]);

  useEffect(() => { fetchStock(); }, [fetchStock]);
  useEffect(() => { fetchPrice(); }, [fetchPrice]);

  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (!success?.id) return;
    if (success.status && success.status !== "pending") return;
    const token = Cookies.get("token");
    if (!token) return;
    const poll = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/orders/${success.id}`, { headers: { Authorization: `Bearer ${token}` } });
        setSuccess(res.data);
        if (res.data.status && res.data.status !== "pending" && pollRef.current) {
          clearInterval(pollRef.current); pollRef.current = null;
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [success?.id, success?.status]);

  const handleBuy = async () => {
    setLoading(true); setError(""); setSuccess(null);
    const token = Cookies.get("token");
    if (!token) { router.push("/login"); return; }
    const isNoStock = (msg: string) => {
      const lower = msg.toLowerCase();
      return lower.includes("no free phones") || lower.includes("out of stock") || lower.includes("unavailable");
    };
    try {
      if (quote && quote.available === false && country !== "any") {
        setError("Out of stock - stock available nahi.");
        alert("Out of stock");
        return;
      }
      const res = await axios.post(`${API_URL}/api/orders/buy`, { service, country }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(res.data);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : "Failed to buy number";
      if (isNoStock(msg)) { setError("Out of stock - stock available nahi."); alert("Out of stock"); }
      else setError(msg);
    } finally { setLoading(false); }
  };

  const copyText = async (text: string, kind: "phone" | "otp") => {
    try { await navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(null), 1500); }
    catch { alert(text); }
  };

  const cancelOrder = async () => {
    if (!success?.id) return;
    if (!confirm("Cancel this order and get refund?")) return;
    setCancelling(true);
    const token = Cookies.get("token");
    try {
      await axios.post(`${API_URL}/api/orders/${success.id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess((prev: any) => (prev ? { ...prev, status: "cancelled" } : prev));
    } catch (err: any) { alert(err.response?.data?.detail || "Cancel failed"); }
    finally { setCancelling(false); }
  };

  const status = (success?.status || "pending").toLowerCase();
  const isPending = status === "pending";
  const isDone = status === "completed";
  const isFailed = status === "failed" || status === "cancelled";
  const selectedRow = stockRows.find((r) => r.country === country);
  const shownPrice = Number(quote?.user_price || selectedRow?.user_price || cheapestLive?.user_price || 0);
  const canBuy = country === "any" ? !!(cheapestLive || quote?.available) : !!(quote?.available || selectedRow?.available);

  return (
    <div className="min-h-screen">
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="card p-6 space-y-6">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm">{error}</div>}
          {success ? (
            <div className="space-y-5 py-2 text-center">
              <p className={`font-medium ${isDone ? "text-emerald-400" : isFailed ? "text-red-400" : "text-blue-300"}`}>
                {isDone ? "OTP Received!" : isFailed ? `Order ${status}` : "Number Purchased"}
              </p>
              <p className="text-2xl font-mono font-bold text-white">{success.phone_number || "-"}</p>
              {success.phone_number && (
                <button type="button" onClick={() => copyText(success.phone_number, "phone")} className="text-xs text-gray-400 border border-[#2a2f3d] px-2 py-1 rounded-lg">{copied === "phone" ? "Copied" : "Copy"}</button>
              )}
              <p className="text-sm text-gray-400">{success.service}{" · "}{countryLabel(success.country)}{" · "}{`$${Number(success.cost || 0).toFixed(4)}`}</p>
              {isPending && <p className="text-amber-300 text-sm">Waiting for OTP...</p>}
              {isDone && (
                <div>
                  <p className="text-4xl font-mono font-bold text-emerald-400">{success.otp_code}</p>
                  <button type="button" onClick={() => copyText(String(success.otp_code), "otp")} className="mt-3 text-sm bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 px-4 py-2 rounded-xl">{copied === "otp" ? "Copied!" : "Copy OTP"}</button>
                </div>
              )}
              {isFailed && <p className="text-sm text-red-300">Amount refunded to your wallet.</p>}
              <div className="flex gap-3 justify-center">
                {isPending && <button type="button" onClick={cancelOrder} disabled={cancelling} className="text-sm text-red-400 border border-red-500/30 px-5 py-2.5 rounded-xl">{cancelling ? "Cancelling..." : "Cancel & Refund"}</button>}
                <Link href="/dashboard" className="btn-ghost text-sm px-5 py-2.5">Dashboard</Link>
                <button type="button" onClick={() => { setSuccess(null); setError(""); fetchPrice(); fetchStock(); }} className="btn-primary text-sm px-5 py-2.5">Buy Another</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Service</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICES.map((s) => (
                    <button key={s.value} type="button" onClick={() => { setService(s.value); setCountry("any"); setError(""); }}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm ${service === s.value ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-[#12151c] border-[#2a2f3d] text-gray-300"}`}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country {stockLoading ? "(loading rates...)" : `(${sortedRows.length} countries)`}</label>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search country..." className="input-field text-sm mb-3" />
                <button type="button" onClick={() => { setCountry("any"); setError(""); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl border text-sm text-left ${country === "any" ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-[#12151c] border-[#2a2f3d] text-gray-300"}`}>
                  <span className="text-xl">{"\uD83C\uDF10"}</span>
                  <span className="flex-1">Any (Cheapest in stock)</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {cheapestLive ? formatUsd(rowPrice(cheapestLive)) : stockLoading ? "..." : "-"}
                  </span>
                </button>
                <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto pr-1">
                  {sortedRows.map((row) => {
                    const p = rowPrice(row);
                    return (
                      <button key={row.country} type="button" onClick={() => { setCountry(row.country); setError(""); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left ${country === row.country ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-[#12151c] border-[#2a2f3d] text-gray-300"}`}>
                        <span className="text-xl">{countryFlag(row.country)}</span>
                        <span className="flex-1">{countryLabel(row.country)}</span>
                        <span className="text-xs font-semibold text-emerald-400 whitespace-nowrap">
                          {p > 0 ? formatUsd(p) : "-"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d] space-y-2">
                <p className="text-xs text-gray-500">Live price</p>
                <p className="text-white font-medium">{SERVICES.find((s) => s.value === service)?.label}{" · "}{country === "any" ? "Any" : `${countryFlag(country)} ${countryLabel(country)}`}</p>
                {priceLoading ? <p className="text-sm text-gray-400">Fetching price...</p> : shownPrice > 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-emerald-400">{formatUsd(Number(quote?.user_price || shownPrice))}</span>
                    {quote?.available && <span className="badge bg-blue-500/15 text-blue-300 border border-blue-500/30">Stock: {quote.total_stock || quote.stock}</span>}
                    {quote && quote.available === false && <span className="text-xs text-amber-400">No live stock</span>}
                  </div>
                ) : <span className="text-amber-400 text-sm">Rate available nahi</span>}
              </div>
              <button onClick={handleBuy} disabled={loading || priceLoading || !canBuy} className="w-full btn-primary py-3.5 text-base">
                {loading ? "Buying number..." : canBuy && shownPrice > 0 ? `Buy for ${formatUsd(Number(quote?.user_price || shownPrice))}` : "Out of stock"}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
