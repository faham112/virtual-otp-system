"use client";

import { useState } from "react";
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
];

const COUNTRIES = [
  { value: "any", label: "Any (Cheapest)" },
  { value: "england", label: "England" },
  { value: "usa", label: "USA" },
  { value: "russia", label: "Russia" },
  { value: "indonesia", label: "Indonesia" },
  { value: "india", label: "India" },
];

export default function BuyPage() {
  const router = useRouter();
  const [service, setService] = useState("facebook");
  const [country, setCountry] = useState("any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

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
      setError(err.response?.data?.detail || "Failed to buy number");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-blue-600 text-sm">
            ← Back
          </Link>
          <h1 className="font-bold">Buy Number</h1>
          <div></div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center space-y-4">
              <div className="text-green-600 font-medium">Number Purchased!</div>
              <div className="text-3xl font-mono font-bold">
                {success.phone_number}
              </div>
              <p className="text-sm text-gray-500">
                Waiting for OTP... Go to Dashboard to see the code.
              </p>
              <Link
                href="/dashboard"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg text-sm"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Service</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2"
                >
                  {SERVICES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleBuy}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? "Buying..." : "Buy Number"}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
