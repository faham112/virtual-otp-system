"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const COUNTRY_FLAGS: Record<string, string> = {
  any: "🌐",
  england: "🇬🇧",
  usa: "🇺🇸",
  russia: "🇷🇺",
  indonesia: "🇮🇩",
  india: "🇮🇳",
  ukraine: "🇺🇦",
  kazakhstan: "🇰🇿",
  philippines: "🇵🇭",
  vietnam: "🇻🇳",
  brazil: "🇧🇷",
  nigeria: "🇳🇬",
  pakistan: "🇵🇰",
  bangladesh: "🇧🇩",
  china: "🇨🇳",
  germany: "🇩🇪",
  france: "🇫🇷",
  netherlands: "🇳🇱",
  poland: "🇵🇱",
  spain: "🇪🇸",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const getHeaders = () => {
    const token = Cookies.get("token");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchData = useCallback(async (silent = false) => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!silent) setRefreshing(true);

    try {
      const headers = getHeaders();
      const [userRes, ordersRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/me`, { headers }),
        axios.get(`${API_URL}/api/orders/`, { headers }),
      ]);

      setUser(userRes.data);
      setOrders(ordersRes.data);

      const pending = ordersRes.data.filter((o: any) => o.status === "pending");
      for (const order of pending) {
        try {
          const statusRes = await axios.get(`${API_URL}/api/orders/${order.id}`, { headers });
          setOrders((prev) =>
            prev.map((o) => (o.id === order.id ? statusRes.data : o))
          );
          if (["failed", "cancelled"].includes(statusRes.data.status)) {
            const freshUser = await axios.get(`${API_URL}/api/users/me`, { headers });
            setUser(freshUser.data);
          }
        } catch {
          // ignore
        }
      }
    } catch {
      Cookies.remove("token");
      router.push("/login");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(() => {
      fetchData(true);
    }, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  const logout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  const cancelOrder = async (orderId: number) => {
    if (!confirm("Cancel this order and get refund?")) return;
    try {
      await axios.post(`${API_URL}/api/orders/${orderId}/cancel`, {}, { headers: getHeaders() });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cancel failed");
    }
  };

  const copyOtp = async (orderId: number, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      alert(code);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "pending":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "failed":
      case "cancelled":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/15 text-gray-400 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[#0f1117]/80 backdrop-blur-xl border-b border-[#2a2f3d]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold text-white">Virtual OTP</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Balance</p>
              <p className="font-semibold text-white">${user?.balance?.toFixed(4) ?? "0.0000"}</p>
            </div>
            <button onClick={logout} className="btn-ghost text-sm text-red-400 hover:text-red-300">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Welcome, <span className="text-gray-200">{user?.username}</span>
              {user?.is_admin && (
                <span className="ml-2 badge bg-purple-500/20 text-purple-300 border border-purple-500/30">Admin</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {user?.is_admin && (
              <Link
                href="/admin"
                className="text-sm flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 px-4 py-2.5 rounded-xl transition font-medium"
              >
                Admin Panel
              </Link>
            )}
            <Link href="/transactions" className="btn-ghost text-sm">
              Transactions
            </Link>
            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="btn-ghost text-sm flex items-center gap-1.5"
            >
              Refresh
            </button>
            <Link href="/buy" className="btn-primary text-sm flex items-center gap-2">
              Buy Number
            </Link>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2a2f3d] flex items-center justify-between">
            <h2 className="font-medium text-white">Recent Orders</h2>
            <span className="text-xs text-gray-500">{orders.length} total</span>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 mb-4">No orders yet</p>
              <Link href="/buy" className="btn-primary inline-flex text-sm">
                Buy your first number
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2f3d]">
              {orders.map((order) => (
                <div key={order.id} className="px-6 py-5 hover:bg-white/[0.02] transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl mt-0.5">
                        {COUNTRY_FLAGS[order.country] || "🌐"}
                      </div>
                      <div>
                        <p className="font-mono font-semibold text-white text-lg tracking-wide">
                          {order.phone_number || "—"}
                        </p>
                        <p className="text-sm text-gray-400 mt-0.5 capitalize">
                          {order.service} · {order.country}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          ${order.cost?.toFixed(4)} · {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`badge border ${statusColor(order.status)}`}>
                        {order.status}
                      </span>

                      {order.otp_code && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2">
                          <p className="text-xs text-blue-300/70 mb-0.5">OTP Code</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-bold text-xl text-blue-400 tracking-widest">
                              {order.otp_code}
                            </p>
                            <button
                              onClick={() => copyOtp(order.id, order.otp_code)}
                              className="text-xs text-blue-300 hover:text-white border border-blue-500/30 px-2 py-0.5 rounded-lg"
                            >
                              {copiedId === order.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}

                      {order.status === "pending" && (
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="text-xs text-red-400 hover:text-red-300 mt-1"
                        >
                          Cancel & Refund
                        </button>
                      )}
                    </div>
                  </div>

                  {order.sms_text && (
                    <p className="mt-3 text-xs text-gray-500 bg-[#12151c] rounded-lg p-3 font-mono">
                      {order.sms_text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Pending orders auto-refresh every 8 seconds
        </p>
      </main>
    </div>
  );
}
