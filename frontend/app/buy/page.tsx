"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";

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

const COUNTRIES = [
  { value: "any", label: "Any (Cheapest)", flag: "\uD83C\uDF10" },
  { value: "england", label: "England", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { value: "usa", label: "United States", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { value: "russia", label: "Russia", flag: "\uD83C\uDDF7\uD83C\uDDFA" },
  { value: "indonesia", label: "Indonesia", flag: "\uD83C\uDDEE\uD83C\uDDE9" },
  { value: "india", label: "India", flag: "\uD83C\uDDEE\uD83C\uDDF3" },
  { value: "ukraine", label: "Ukraine", flag: "\uD83C\uDDFA\uD83C\uDDE6" },
  { value: "kazakhstan", label: "Kazakhstan", flag: "\uD83C\uDDF0\uD83C\uDDFF" },
  { value: "philippines", label: "Philippines", flag: "\uD83C\uDDF5\uD83C\uDDED" },
  { value: "vietnam", label: "Vietnam", flag: "\uD83C\uDDFB\uD83C\uDDF3" },
  { value: "brazil", label: "Brazil", flag: "\uD83C\uDDE7\uD83C\uDDF7" },
  { value: "nigeria", label: "Nigeria", flag: "\uD83C\uDDF3\uD83C\uDDEC" },
  { value: "pakistan", label: "Pakistan", flag: "\uD83C\uDDF5\uD83C\uDDF0" },
  { value: "bangladesh", label: "Bangladesh", flag: "\uD83C\uDDE7\uD83C\uDDE9" },
  { value: "china", label: "China", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  { value: "germany", label: "Germany", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { value: "france", label: "France", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { value: "netherlands", label: "Netherlands", flag: "\uD83C\uDDF3\uD83C\uDDF1" },
  { value: "poland", label: "Poland", flag: "\uD83C\uDDF5\uD83C\uDDF1" },
  { value: "spain", label: "Spain", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
];

export default function BuyPage() {
  const router = useRouter();
  const [service, setService] = useState("facebook");
  const [country, setCountry] = useState("any");
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [stockMap, setStockMap] = useState<Record<string, any>>({});
  const [hint, setHint] = useState("");
  const [copied, setCopied] = useState<"phone" | "otp" | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedCountry = COUNTRIES.find((c) => c.value === country);
  const visibleCountries = COUNTRIES;

  const fetchStock = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) return;
    setStockLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/catalog/stock`, {
        params: { service },
        headers: { Authorization: `Bearer ${token}` },
      });
      const map: Record<string, any> = {};
      (res.data || []).forEach((item: any) => {
        map[item.country] = item;
      });
      setStockMap(map);
      if (country !== "any" && map[country] && !map[country].available) {
        setHint("");
        setError("Out of stock \u2014 is country mein stock available nahi.");
      }
    } catch {
      setStockMap({});
    } finally {
      setStockLoading(false);
    }
  }, [service, country]);

  const fetchPrice = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) return;
    setPriceLoading(true);
    setQuote(null);
    try {
      const res = await axios.get(`${API_URL}/api/catalog/price`, {
        params: { service, country },
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuote(res.data);
      if (res.data && res.data.available === false) {
        setError("Out of stock \u2014 stock available nahi.");
      } else if (res.data && res.data.available) {
        setError("");
      }
    } catch {
      setQuote(null);
    } finally {
      setPriceLoading(false);
    }
  }, [service, country]);

  useEffect(() => {
    fetchStock();
  }, [service]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!success?.id) return;
    if (success.status && success.status !== "pending") return;
    const token = Cookies.get("token");
    if (!token) return;
    const poll = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/orders/${success.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess(res.data);
        if (res.data.status && res.data.status !== "pending") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [success?.id, success?.status]);

  const handleBuy = async () => {
    setLoading(true);
    setError("");
    setHint("");
    setSuccess(null);
    setCopied(null);
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const isNoStock = (msg: string) => {
      const lower = msg.toLowerCase();
      return lower.includes("no free phones") || lower.includes("out of stock") || lower.includes("unavailable");
    };
    try {
      if (quote && quote.available === false) {
        setError("Out of stock \u2014 stock available nahi.");
        alert("Out of stock");
        return;
      }
      const res = await axios.post(
        `${API_URL}/api/orders/buy`,
        { service, country },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : "Failed to buy number";
      if (isNoStock(msg)) {
        setError("Out of stock \u2014 stock available nahi.");
        alert("Out of stock");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, kind: "phone" | "otp") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      alert(text);
    }
  };

  const cancelOrder = async () => {
    if (!success?.id) return;
    if (!confirm("Cancel this order and get refund?")) return;
    setCancelling(true);
    const token = Cookies.get("token");
    try {
      await axios.post(`${API_URL}/api/orders/${success.id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess((prev: any) => (prev ? { ...prev, status: "cancelled" } : prev));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const resetToBuy = () => {
    setSuccess(null);
    setError("");
    setHint("");
    setCopied(null);
    fetchPrice();
    fetchStock();
  };

  const status = (success?.status || "pending").toLowerCase();
  const isPending = status === "pending";
  const isDone = status === "completed";
  const isFailed = status === "failed" || status === "cancelled";

  return (
    <div className="min-h-screen">
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="card p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm">{error}</div>
          )}
          {hint && (
            <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 p-3.5 rounded-xl text-sm">{hint}</div>
          )}

          {success ? (
            <div className="space-y-5 py-2">
              <div className="text-center space-y-3">
                <p className={`font-medium ${isDone ? "text-emerald-400" : isFailed ? "text-red-400" : "text-blue-300"}`}>
                  {isDone ? "OTP Received!" : isFailed ? `Order ${status}` : "Number Purchased"}
                </p>
                <p className="text-2xl font-mono font-bold text-white">{success.phone_number || "-"}</p>
                {success.phone_number && (
                  <button type="button" onClick={() => copyText(success.phone_number, "phone")} className="text-xs text-gray-400 border border-[#2a2f3d] px-2 py-1 rounded-lg">
                    {copied === "phone" ? "Copied" : "Copy"}
                  </button>
                )}
                <p className="text-sm text-gray-400">{success.service} \u00b7 {success.country} \u00b7 ${Number(success.cost || 0).toFixed(4)}</p>
              </div>
              {isPending && <p className="text-amber-300 text-sm text-center">Waiting for OTP...</p>}
              {isDone && (
                <div className="text-center">
                  <p className="text-4xl font-mono font-bold text-emerald-400">{success.otp_code}</p>
                  <button type="button" onClick={() => copyText(String(success.otp_code), "otp")} className="mt-3 text-sm bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 px-4 py-2 rounded-xl">
                    {copied === "otp" ? "Copied!" : "Copy OTP"}
                  </button>
                </div>
              )}
              {isFailed && (
                <p className="text-sm text-red-300 text-center">Amount refunded to your wallet.</p>
              )}
              <div className="flex gap-3 justify-center">
                {isPending && (
                  <button type="button" onClick={cancelOrder} disabled={cancelling} className="text-sm text-red-400 border border-red-500/30 px-5 py-2.5 rounded-xl">
                    {cancelling ? "Cancelling..." : "Cancel & Refund"}
                  </button>
                )}
                <Link href="/dashboard" className="btn-ghost text-sm px-5 py-2.5">Dashboard</Link>
                <button type="button" onClick={resetToBuy} className="btn-primary text-sm px-5 py-2.5">Buy Another</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Service</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICES.map((s) => (
                    <button key={s.value} type="button" onClick={() => { setService(s.value); setHint(""); setError(""); }}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm ${service === s.value ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-[#12151c] border-[#2a2f3d] text-gray-300"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {visibleCountries.map((c) => (
                    <button key={c.value} type="button" onClick={() => { setCountry(c.value); setHint(""); setError(""); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left ${country === c.value ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-[#12151c] border-[#2a2f3d] text-gray-300"}`}>
                      <span className="text-xl">{c.flag}</span>
                      <span className="flex-1">{c.label}</span>
                      {c.value !== "any" && stockMap[c.value] && (
                        stockMap[c.value].available ? (
                          <span className="text-xs text-emerald-400">${stockMap[c.value].user_price?.toFixed(2) || "-"}</span>
                        ) : (
                          <span className="text-xs text-amber-400">Out of stock</span>
                        )
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d] space-y-2">
                <p className="text-xs text-gray-500">Live price & availability</p>
                <p className="text-white font-medium">{SERVICES.find((s) => s.value === service)?.label} \u00b7 {selectedCountry?.flag} {selectedCountry?.label}</p>
                {priceLoading ? (
                  <p className="text-sm text-gray-400">Fetching price & stock...</p>
                ) : quote ? (
                  quote.available ? (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-emerald-400">${quote.user_price?.toFixed(4)}</span>
                      <span className="badge bg-blue-500/15 text-blue-300 border border-blue-500/30">Stock: {quote.total_stock || quote.stock}</span>
                    </div>
                  ) : (
                    <span className="text-amber-400 text-sm">Out of stock \u2014 stock available nahi</span>
                  )
                ) : (
                  <p className="text-sm text-gray-500">Could not load price</p>
                )}
              </div>
              <button onClick={handleBuy} disabled={loading || priceLoading || (quote && !quote.available)} className="w-full btn-primary py-3.5 text-base">
                {loading ? "Buying number..." : quote?.available ? `Buy for $${quote.user_price?.toFixed(4)}` : "Out of stock"}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
