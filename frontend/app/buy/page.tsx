"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";
import { countryFlag, countryLabel, countryIso } from "../lib/countries";
import { PageSkeleton, useMinLoading } from "../components/PageSkeleton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SERVICES = [
  { value: "facebook", label: "Facebook", icon: "f", color: "bg-[#1877F2]" },
  { value: "whatsapp", label: "WhatsApp", icon: "W", color: "bg-[#25D366]" },
  { value: "telegram", label: "Telegram", icon: "T", color: "bg-[#229ED9]" },
  { value: "google", label: "Google", icon: "G", color: "bg-[#EA4335]" },
  { value: "instagram", label: "Instagram", icon: "Ig", color: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]" },
  { value: "twitter", label: "Twitter / X", icon: "𝕏", color: "bg-zinc-900" },
  { value: "tiktok", label: "TikTok", icon: "♪", color: "bg-black" },
  { value: "discord", label: "Discord", icon: "D", color: "bg-[#5865F2]" },
  { value: "microsoft", label: "Microsoft", icon: "M", color: "bg-[#00A4EF]" },
  { value: "amazon", label: "Amazon", icon: "a", color: "bg-[#FF9900]" },
];

function FlagImg({ slug, size = 22 }: { slug: string; size?: number }) {
  if (!slug || slug === "any") {
    return <span className="inline-flex items-center justify-center shrink-0 text-base" style={{ width: size, height: size }}>🌐</span>;
  }
  const iso = countryIso(slug);
  if (!iso) return <span className="text-base shrink-0">{countryFlag(slug)}</span>;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={countryLabel(slug)}
      width={size}
      height={Math.round(size * 0.75)}
      className="shrink-0 rounded-[2px] object-cover shadow-sm"
      loading="lazy"
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = "none";
        const sib = el.nextElementSibling as HTMLElement | null;
        if (sib) sib.style.display = "inline";
      }}
    />
  );
}

function ServiceIcon({ service }: { service: (typeof SERVICES)[number] }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-[11px] font-bold shrink-0 ${service.color}`}>
      {service.icon}
    </span>
  );
}

function rowPrice(row: any): number {
  const n = Number(row?.user_price ?? row?.price ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatUsd(n: number): string {
  if (!n || n <= 0) return "";
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

function formatPkr(usd: number, rate: number): string {
  if (!usd || usd <= 0 || !rate) return formatUsd(usd);
  return `Rs ${Math.round(usd * rate).toLocaleString("en-PK")}`;
}

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
  const [stockRows, setStockRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [quality, setQuality] = useState<"cheaper" | "balanced" | "quality">("cheaper");
  const [hideOos, setHideOos] = useState(true);
  const [copied, setCopied] = useState<"phone" | "otp" | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [fxRate, setFxRate] = useState(0);
  const [pageReady, setPageReady] = useState(false);
  const showSkeleton = useMinLoading(!pageReady, 3000);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sortedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = stockRows.filter((r) => {
      if (hideOos && !r.available) return false;
      if (!q) return true;
      const label = countryLabel(r.country).toLowerCase();
      return String(r.country).includes(q) || label.includes(q);
    });
    return [...rows].sort((a, b) => {
      const aOk = !!a.available;
      const bOk = !!b.available;
      if (aOk !== bOk) return aOk ? -1 : 1;
      const ap = rowPrice(a);
      const bp = rowPrice(b);
      if (quality === "quality") return (bp || 0) - (ap || 0);
      if (ap !== bp) return (ap || 9999) - (bp || 9999);
      return countryLabel(a.country).localeCompare(countryLabel(b.country));
    });
  }, [stockRows, search, hideOos, quality]);

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
      setPageReady(true);
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
      setError("");
    } catch {
      setQuote(null);
    } finally {
      setPriceLoading(false);
    }
  }, [service, country]);

  useEffect(() => {
    axios.get(`${API_URL}/api/public/fx`).then((res) => {
      if (res.data?.rate) setFxRate(Number(res.data.rate));
    }).catch(() => {});
  }, []);

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

  const selectedRow = stockRows.find((r) => r.country === country);
  const isLive = country === "any" ? !!(cheapestLive || quote?.available) : !!(quote?.available || selectedRow?.available);
  const shownPrice = isLive ? Number(quote?.user_price || selectedRow?.user_price || cheapestLive?.user_price || 0) : 0;
  const priceLabel = (usd: number) => (fxRate > 0 ? formatPkr(usd, fxRate) : formatUsd(usd));

  const handleBuy = async () => {
    setLoading(true); setError(""); setSuccess(null);
    const token = Cookies.get("token");
    if (!token) { router.push("/login"); return; }
    if (!isLive) { setError("Out of stock"); setLoading(false); return; }
    try {
      const res = await axios.post(`${API_URL}/api/orders/buy`, { service, country, quality }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(res.data);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : "Failed to buy number";
      const lower = msg.toLowerCase();
      if (lower.includes("no free phones") || lower.includes("out of stock") || lower.includes("unavailable")) setError("Out of stock");
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

  const tabOn = "bg-blue-600/15 border-blue-500/40 text-blue-600";
  const tabOff = "bg-soft border-line text-fg hover:border-blue-500/30";
  const filterOn = "bg-emerald-600/15 border-emerald-500/40 text-emerald-600";
  const filterOff = "bg-soft border-line text-muted";

  if (showSkeleton) {
    return <PageSkeleton title="Loading buy" lines={6} />;
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="card p-6 space-y-6">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm">{error}</div>}
          {success ? (
            <div className="space-y-5 py-2 text-center">
              <p className={`font-medium ${isDone ? "text-emerald-500" : isFailed ? "text-red-400" : "text-blue-500"}`}>
                {isDone ? "OTP Received!" : isFailed ? `Order ${status}` : "Number Purchased"}
              </p>
              <p className="text-2xl font-mono font-bold text-fg">{success.phone_number || "-"}</p>
              {success.phone_number && (
                <button type="button" onClick={() => copyText(success.phone_number, "phone")} className="text-xs text-muted border border-line px-2 py-1 rounded-lg">{copied === "phone" ? "Copied" : "Copy"}</button>
              )}
              <p className="text-sm text-muted">{success.service}{" - "}{countryLabel(success.country)}{" - "}{priceLabel(Number(success.cost || 0))}</p>
              {isPending && <p className="text-amber-500 text-sm">Waiting for OTP...</p>}
              {isDone && (
                <div>
                  <p className="text-4xl font-mono font-bold text-emerald-500">{success.otp_code}</p>
                  <button type="button" onClick={() => copyText(String(success.otp_code), "otp")} className="mt-3 text-sm bg-emerald-600/15 text-emerald-600 border border-emerald-500/40 px-4 py-2 rounded-xl">{copied === "otp" ? "Copied!" : "Copy OTP"}</button>
                </div>
              )}
              {isFailed && <p className="text-sm text-red-400">Amount refunded to your wallet.</p>}
              <div className="flex gap-3 justify-center flex-wrap">
                {isPending && <button type="button" onClick={cancelOrder} disabled={cancelling} className="text-sm text-red-400 border border-red-500/30 px-5 py-2.5 rounded-xl">{cancelling ? "Cancelling..." : "Cancel & Refund"}</button>}
                <Link href="/dashboard" className="btn-ghost text-sm px-5 py-2.5">Dashboard</Link>
                <button type="button" onClick={() => { setSuccess(null); setError(""); fetchPrice(); fetchStock(); }} className="btn-primary text-sm px-5 py-2.5">Buy Another</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-fg mb-2">Service</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICES.map((s) => (
                    <button key={s.value} type="button" onClick={() => { setService(s.value); setCountry("any"); setError(""); }}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm flex items-center gap-2 transition-colors ${service === s.value ? tabOn : tabOff}`}>
                      <ServiceIcon service={s} />
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg mb-2">Filter</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button type="button" onClick={() => setQuality("cheaper")} className={`px-2 py-2.5 rounded-xl border text-xs font-medium ${quality === "cheaper" ? filterOn : filterOff}`}>Cheaper</button>
                  <button type="button" onClick={() => setQuality("balanced")} className={`px-2 py-2.5 rounded-xl border text-xs font-medium ${quality === "balanced" ? filterOn : filterOff}`}>Balanced</button>
                  <button type="button" onClick={() => setQuality("quality")} className={`px-2 py-2.5 rounded-xl border text-xs font-medium ${quality === "quality" ? filterOn : filterOff}`}>Better quality</button>
                </div>
                <button type="button" onClick={() => setHideOos((v) => !v)} className={`px-3 py-1.5 rounded-lg border text-xs ${hideOos ? "bg-emerald-600/15 border-emerald-500/40 text-emerald-600" : "bg-soft border-line text-muted"}`}>
                  {hideOos ? "In stock only" : "Show out of stock"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg mb-2">Country {stockLoading ? "(loading rates...)" : `(${sortedRows.length} countries)`}</label>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search country..." className="input-field text-sm mb-3" />
                <button type="button" onClick={() => { setCountry("any"); setError(""); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl border text-sm text-left ${country === "any" ? tabOn : tabOff}`}>
                  <span className="text-xl shrink-0">🌐</span>
                  <span className="flex-1">Any (Cheapest in stock)</span>
                  <span className={`text-xs font-semibold ${cheapestLive ? "text-emerald-500" : "text-amber-500"}`}>
                    {stockLoading ? "..." : cheapestLive ? priceLabel(rowPrice(cheapestLive)) : "Out of stock"}
                  </span>
                </button>
                <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto pr-1">
                  {sortedRows.map((row) => {
                    const live = !!row.available;
                    const p = rowPrice(row);
                    return (
                      <button key={row.country} type="button" onClick={() => { setCountry(row.country); setError(""); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left ${country === row.country ? tabOn : tabOff}`}>
                        <span className="relative inline-flex items-center justify-center w-7 h-5 shrink-0">
                          <FlagImg slug={row.country} size={22} />
                          <span className="hidden text-base">{countryFlag(row.country)}</span>
                        </span>
                        <span className="flex-1 truncate">{countryLabel(row.country)}</span>
                        <span className={`text-xs font-semibold whitespace-nowrap ${live && p > 0 ? "text-emerald-500" : "text-amber-500"}`}>
                          {live && p > 0 ? priceLabel(p) : "Out of stock"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="panel p-4 space-y-2">
                <p className="text-xs text-muted">Live price</p>
                <p className="text-fg font-medium flex items-center gap-2 flex-wrap">
                  {SERVICES.find((s) => s.value === service)?.label}{" - "}
                  {country === "any" ? "Any" : (
                    <span className="inline-flex items-center gap-1.5">
                      <FlagImg slug={country} size={18} />
                      {countryLabel(country)}
                    </span>
                  )}
                </p>
                {priceLoading ? <p className="text-sm text-muted">Fetching price...</p> : isLive && shownPrice > 0 ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-2xl font-bold text-emerald-500">{priceLabel(shownPrice)}</span>
                    {fxRate > 0 && <span className="text-xs text-muted">(~{formatUsd(shownPrice)})</span>}
                    {quote?.available && <span className="badge bg-blue-500/15 text-blue-600 border border-blue-500/30">Stock: {quote.stock || quote.total_stock}</span>}
                  </div>
                ) : <span className="text-amber-500 text-sm font-medium">Out of stock</span>}
              </div>

              <button onClick={handleBuy} disabled={loading || priceLoading || !isLive} className="w-full btn-primary py-3.5 text-base">
                {loading ? "Buying number..." : isLive && shownPrice > 0 ? `Buy for ${priceLabel(shownPrice)}` : "Out of stock"}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
