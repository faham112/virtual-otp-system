"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SERVICES = [
  { value: "facebook", label: "Facebook", icon: "f" },
  { value: "whatsapp", label: "WhatsApp", icon: "W" },
  { value: "telegram", label: "Telegram", icon: "T" },
  { value: "google", label: "Google", icon: "G" },
  { value: "instagram", label: "Instagram", icon: "Ig" },
  { value: "twitter", label: "Twitter / X", icon: "X" },
  { value: "tiktok", label: "TikTok", icon: "Tk" },
  { value: "discord", label: "Discord", icon: "D" },
  { value: "microsoft", label: "Microsoft", icon: "M" },
  { value: "amazon", label: "Amazon", icon: "A" },
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

  const selectedCountry = COUNTRIES.find((c) => c.value === country);

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
      // Only the selected country is sent — no fallback
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
                  }}
                  className="bg-[#12151c] hover:bg-[#1e2230] border border-[#2a2f3d] text-gray-300 text-sm px-5 py-2.5 rounded-xl transition"
                >
                  Buy Another
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Service */}
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

              {/* Country with flags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Country <span className="text-gray-500 font-normal">(only this country will be requested)</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
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

              {/* Summary */}
              <div className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d]">
                <p className="text-xs text-gray-500 mb-1">You are buying</p>
                <p className="text-white font-medium">
                  {SERVICES.find((s) => s.value === service)?.label} number
                </p>
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                  <span className="text-lg">{selectedCountry?.flag}</span>
                  {selectedCountry?.label}
                </p>
              </div>

              <button
                onClick={handleBuy}
                disabled={loading}
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
                ) : (
                  "Buy Number"
                )}
              </button>

              <p className="text-xs text-center text-gray-500">
                Cost will be calculated with markup after provider responds.
                Full refund if OTP fails or times out.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
