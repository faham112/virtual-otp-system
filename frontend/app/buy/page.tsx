"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);

  const selectedCountry = COUNTRIES.find((c) => c.value === country);

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
    fetchPrice();
  }, [fetchPrice]);

  const handleBuy = async () => {
    setLoading(true);
    setError("");
    setSuccess(null);

    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/api/orders/buy`,
        { service, country },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to buy number");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-emerald-400 font-medium mb-2">Number Purchased!</p>
                <p className="text-3xl font-mono font-bold text-white tracking-wider">
                  {success.phone_number}
                </p>
                <p className="text-sm text-gray-400 mt-2">Charged: ${success.cost?.toFixed(4)}</p>
              </div>
              <p className="text-sm text-gray-400">
                Waiting for OTP. It will appear automatically on your Dashboard.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <Link href="/dashboard" className="btn-primary text-sm">
                  Go to Dashboard
                </Link>
                <button
                  onClick={() => {
                    setSuccess(null);
                    setError("");
                    fetchPrice();
                  }}
                  className="bg-[#12151c] hover:bg-[#1e2230] border border-[#2a2f3d] text-gray-300 text-sm px-5 py-2.5 rounded-xl transition"
                >
                  Buy Another
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Service</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setService(s.value)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm transition ${
                        service === s.value
                          ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                          : "bg-[#12151c] border-[#2a2f3d] text-gray-300 hover:border-[#3a4055]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Country <span className="text-gray-500 font-normal">(only this country)</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCountry(c.value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition text-left ${
                        country === c.value
                          ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                          : "bg-[#12151c] border-[#2a2f3d] text-gray-300 hover:border-[#3a4055]"
                      }`}
                    >
                      <span className="text-xl">{c.flag}</span>
                      <span className="flex-1">{c.label}</span>
                      {country === c.value && (
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live price box */}
              <div className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d] space-y-2">
                <p className="text-xs text-gray-500">Live quote (5sim + admin markup)</p>
                <p className="text-white font-medium">
                  {SERVICES.find((s) => s.value === service)?.label} · {selectedCountry?.flag}{" "}
                  {selectedCountry?.label}
                </p>

                {priceLoading ? (
                  <p className="text-sm text-gray-400 animate-pulse">Fetching price & stock...</p>
                ) : quote ? (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {quote.available ? (
                      <>
                        <span className="text-2xl font-bold text-emerald-400">
                          ${quote.user_price?.toFixed(4)}
                        </span>
                        <span className="text-xs text-gray-500">
                          (provider ${quote.provider_cost?.toFixed(4)} + {quote.markup_percent}% markup)
                        </span>
                        <span className="badge bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          Stock: {quote.total_stock || quote.stock}
                        </span>
                        {quote.rate > 0 && (
                          <span className="text-xs text-gray-500">Rate ~{quote.rate}%</span>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-400 text-sm">Out of stock / unavailable</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Could not load price</p>
                )}
              </div>

              <button
                onClick={handleBuy}
                disabled={loading || priceLoading || (quote && !quote.available)}
                className="w-full btn-primary py-3.5 text-base"
              >
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
                Fixed system markup set by admin. Full refund if OTP fails or times out.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
