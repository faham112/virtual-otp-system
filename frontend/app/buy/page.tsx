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
  { value: "any", label: "Any (Cheapest)", flag: "🌐" },
  { value: "england", label: "England", flag: "🇬🇧" },
  { value: "usa", label: "United States", flag: "🇺🇸" },
  { value: "russia", label: "Russia", flag: "🇷🇺" },
  { value: "indonesia", label: "Indonesia", flag: "🇮🇩" },
  { value: "india", label: "India", flag: "🇮🇳" },
  { value: "ukraine", label: "Ukraine", flag: "🇺🇦" },
  { value: "kazakhstan", label: "Kazakhstan", flag: "🇰🇿" },
  { value: "philippines", label: "Philippines", flag: "🇵🇭" },
  { value: "vietnam", label: "Vietnam", flag: "🇻🇳" },
  { value: "brazil", label: "Brazil", flag: "🇧🇷" },
  { value: "nigeria", label: "Nigeria", flag: "🇳🇬" },
  { value: "pakistan", label: "Pakistan", flag: "🇵🇰" },
  { value: "bangladesh", label: "Bangladesh", flag: "🇧🇩" },
  { value: "china", label: "China", flag: "🇨🇳" },
  { value: "germany", label: "Germany", flag: "🇩🇪" },
  { value: "france", label: "France", flag: "🇫🇷" },
  { value: "netherlands", label: "Netherlands", flag: "🇳🇱" },
  { value: "poland", label: "Poland", flag: "🇵🇱" },
  { value: "spain", label: "Spain", flag: "🇪🇸" },
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

  // Always show every country so user can pick live market stock (not only cheapest)
  const visibleCountries = COUNTRIES;

  const pickNextInStock = (exclude: string, map: Record<string, any>) => {
    const candidates = COUNTRIES.filter((c) => {
      if (c.value === "any" || c.value === exclude) return false;
      const s = map[c.value];
      return s && s.available && (s.stock > 0 || s.total_stock > 0 || s.user_price > 0);
    });
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      const pa = map[a.value]?.user_price ?? 9999;
      const pb = map[b.value]?.user_price ?? 9999;
      return pa - pb;
    });
    return candidates[0].value;
  };

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
        const next = pickNextInStock(country, map);
        if (next) {
          setCountry(next);
          setHint(`Switched to ${COUNTRIES.find((c) => c.value === next)?.label} (previous country out of stock)`);
        } else {
          setCountry("any");
          setHint("Selected country out of stock — switched to Any (Cheapest)");
        }
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
    } catch {
      setQuote(null);
    } finally {
      setPriceLoading(false);
    }
  }, [service, country]);

  useEffect(() => {
    fetchStock();
  }, [service]); // eslint-disable-line react-hooks/exhaustive-deps

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
      return (
        lower.includes("no free phones") ||
        lower.includes("out of stock") ||
        lower.includes("unavailable")
      );
    };
    const tryBuy = async (c: string) => {
      const res = await axios.post(
        `${API_URL}/api/orders/buy`,
        { service, country: c },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    };
    const loadStockMap = async () => {
      const stockRes = await axios.get(`${API_URL}/api/catalog/stock`, {
        params: { service },
        headers: { Authorization: `Bearer ${token}` },
      });
      const map: Record<string, any> = {};
      (stockRes.data || []).forEach((item: any) => {
        map[item.country] = item;
      });
      setStockMap(map);
      return map;
    };
    const buildFallbackQueue = (start: string, map: Record<string, any>) => {
      const tried = new Set<string>();
      const queue: string[] = [];
      const push = (c: string) => {
        if (!c || tried.has(c)) return;
        tried.add(c);
        queue.push(c);
      };
      push(start);
      const ranked = COUNTRIES.filter((c) => {
        if (c.value === "any") return false;
        const s = map[c.value];
        return s && s.available && (s.stock > 0 || s.total_stock > 0 || s.user_price > 0);
      }).sort((a, b) => {
        const pa = map[a.value]?.user_price ?? 9999;
        const pb = map[b.value]?.user_price ?? 9999;
        return pa - pb;
      });
      ranked.forEach((c) => push(c.value));
      return queue;
    };
    try {
      try {
        const data = await tryBuy(country);
        setSuccess(data);
        return;
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        const msg = typeof detail === "string" ? detail : "Failed to buy number";
        if (!isNoStock(msg)) {
          setError(msg);
          return;
        }
      }
      setHint("Cheapest not available — trying next prices…");
      let map: Record<string, any> = {};
      try {
        map = await loadStockMap();
      } catch {
        setError("No free phones. Could not load alternative countries.");
        setHint("Try another service or wait a few minutes.");
        return;
      }
      const queue = buildFallbackQueue(country, map).filter((c) => c !== country);
      const maxTries = 5;
      let lastMsg = "No free phones available.";
      for (let i = 0; i < Math.min(queue.length, maxTries); i++) {
        const c = queue[i];
        const label = COUNTRIES.find((x) => x.value === c)?.label || c;
        const price = map[c]?.user_price;
        setCountry(c);
        setHint(`Trying ${label}${price != null ? ` ($${Number(price).toFixed(2)})` : ""}…`);
        try {
          const data = await tryBuy(c);
          setSuccess(data);
          setError("");
          setHint(
            `Bought from ${label}${price != null ? ` at $${Number(price).toFixed(2)}` : ""} (cheaper option was out of stock).`
          );
          return;
        } catch (err: any) {
          const detail = err.response?.data?.detail;
          lastMsg = typeof detail === "string" ? detail : lastMsg;
          if (!isNoStock(lastMsg)) {
            setError(lastMsg);
            setHint(`Stopped on ${label}: ${lastMsg}`);
            return;
          }
        }
      }
      setError(lastMsg);
      setHint(
        "No free phones on cheapest or next prices. Pick a country with stock manually, or try another service."
      );
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
      await axios.post(
        `${API_URL}/api/orders/${success.id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      <header className="sticky top-0 z-20 bg-[#0f1117]/80 backdrop-blur-xl border-b border-[#2a2f3d]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="font-semibold text-white">Buy Number</h1>
          <div className="w-12" />
        </div>
      </header>

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
                <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${isDone ? "bg-emerald-500/15" : isFailed ? "bg-red-500/15" : "bg-blue-500/15"}`}>
                  {isPending ? (
                    <svg className="animate-spin h-7 w-7 text-blue-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : isDone ? (
                    <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`font-medium mb-1 ${isDone ? "text-emerald-400" : isFailed ? "text-red-400" : "text-blue-300"}`}>
                    {isDone ? "OTP Received!" : isFailed ? `Order ${status}` : "Number Purchased"}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider">{success.phone_number || "—"}</p>
                    {success.phone_number && (
                      <button type="button" onClick={() => copyText(success.phone_number, "phone")} className="text-xs text-gray-400 hover:text-white border border-[#2a2f3d] px-2 py-1 rounded-lg">
                        {copied === "phone" ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1.5">{success.service} · {success.country} · ${Number(success.cost || 0).toFixed(4)}</p>
                </div>
              </div>

              <div className={`rounded-2xl border p-5 space-y-4 ${isDone ? "bg-emerald-500/10 border-emerald-500/30" : isFailed ? "bg-red-500/10 border-red-500/30" : "bg-[#12151c] border-[#2a2f3d]"}`}>
                {isPending && (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
                      </span>
                      <p className="text-amber-300 font-medium text-sm">Waiting for OTP…</p>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Use this number on the app/site now. SMS code will appear here automatically (checks every 5 seconds).
                    </p>
                    <div className="flex items-center justify-center py-3">
                      <div className="h-10 min-w-[10rem] rounded-xl bg-[#0f1117] border border-dashed border-[#2a2f3d] flex items-center justify-center">
                        <span className="font-mono text-gray-600 tracking-[0.35em] text-lg">······</span>
                      </div>
                    </div>
                    <p className="text-xs text-center text-gray-500">Auto-refreshing · Full refund if timeout</p>
                  </>
                )}
                {isDone && (
                  <>
                    <p className="text-xs text-emerald-300/80 uppercase tracking-wide">OTP Code</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <p className="text-4xl font-mono font-bold text-emerald-400 tracking-[0.2em]">{success.otp_code}</p>
                      <button type="button" onClick={() => copyText(String(success.otp_code), "otp")} className="text-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-4 py-2 rounded-xl">
                        {copied === "otp" ? "Copied!" : "Copy OTP"}
                      </button>
                    </div>
                    {success.sms_text && (
                      <p className="text-xs text-gray-500 bg-[#0f1117]/60 rounded-lg p-3 font-mono break-all">{success.sms_text}</p>
                    )}
                  </>
                )}
                {isFailed && (
                  <p className="text-sm text-red-300 text-center">
                    {status === "cancelled" ? "Order cancelled. Amount refunded to your wallet." : "Order failed or timed out. Amount refunded to your wallet."}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
                {isPending && (
                  <button type="button" onClick={cancelOrder} disabled={cancelling} className="text-sm text-red-400 hover:text-red-300 border border-red-500/30 px-5 py-2.5 rounded-xl disabled:opacity-50">
                    {cancelling ? "Cancelling…" : "Cancel & Refund"}
                  </button>
                )}
                <Link href="/dashboard" className="btn-ghost text-sm text-center px-5 py-2.5">Dashboard</Link>
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
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm transition ${service === s.value ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-[#12151c] border-[#2a2f3d] text-gray-300 hover:border-[#3a4055]"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Country <span className="text-gray-500 font-normal">{stockLoading ? "(checking stock...)" : "(live market prices)"}</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {visibleCountries.map((c) => (
                    <button key={c.value} type="button" onClick={() => { setCountry(c.value); setHint(""); setError(""); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition text-left ${country === c.value ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-[#12151c] border-[#2a2f3d] text-gray-300 hover:border-[#3a4055]"}`}>
                      <span className="text-xl">{c.flag}</span>
                      <span className="flex-1">{c.label}</span>
                      {c.value !== "any" && stockMap[c.value] && (
                        stockMap[c.value].available ? (
                          <span className="text-xs text-emerald-400">${stockMap[c.value].user_price?.toFixed(2) || "—"}</span>
                        ) : (
                          <span className="text-xs text-gray-600">OOS</span>
                        )
                      )}
                      {country === c.value && (
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d] space-y-2">
                <p className="text-xs text-gray-500">Live price & availability</p>
                <p className="text-white font-medium">{SERVICES.find((s) => s.value === service)?.label} · {selectedCountry?.flag} {selectedCountry?.label}</p>
                {priceLoading ? (
                  <p className="text-sm text-gray-400 animate-pulse">Fetching price & stock...</p>
                ) : quote ? (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {quote.available ? (
                      <>
                        <span className="text-2xl font-bold text-emerald-400">${quote.user_price?.toFixed(4)}</span>
                        <span className="badge bg-blue-500/15 text-blue-300 border border-blue-500/30">Stock: {quote.total_stock || quote.stock}</span>
                      </>
                    ) : (
                      <span className="text-amber-400 text-sm">Out of stock / unavailable</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Could not load price</p>
                )}
              </div>
              <button onClick={handleBuy} disabled={loading || priceLoading || (quote && !quote.available)} className="w-full btn-primary py-3.5 text-base">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Buying number...
                  </span>
                ) : quote?.available ? (
                  `Buy for $${quote.user_price?.toFixed(4)}`
                ) : (
                  "Buy Number"
                )}
              </button>
              <p className="text-xs text-center text-gray-500">
                Saste na milne pe system next prices try karega. Aap khud bhi live stock wala country select kar sakte ho.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
