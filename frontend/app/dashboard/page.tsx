"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "../components/AppHeader";
import { DashboardSkeleton, useMinLoading } from "../components/PageSkeleton";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const COUNTRY_FLAGS: Record<string, string> = {
  any: "\uD83C\uDF10",
  england: "\uD83C\uDDEC\uD83C\uDDE7",
  usa: "\uD83C\uDDFA\uD83C\uDDF8",
  russia: "\uD83C\uDDF7\uD83C\uDDFA",
  indonesia: "\uD83C\uDDEE\uD83C\uDDE9",
  india: "\uD83C\uDDEE\uD83C\uDDF3",
  ukraine: "\uD83C\uDDFA\uD83C\uDDE6",
  kazakhstan: "\uD83C\uDDF0\uD83C\uDDFF",
  philippines: "\uD83C\uDDF5\uD83C\uDDED",
  vietnam: "\uD83C\uDDFB\uD83C\uDDF3",
  brazil: "\uD83C\uDDE7\uD83C\uDDF7",
  nigeria: "\uD83C\uDDF3\uD83C\uDDEC",
  pakistan: "\uD83C\uDDF5\uD83C\uDDF0",
  bangladesh: "\uD83C\uDDE7\uD83C\uDDE9",
  china: "\uD83C\uDDE8\uD83C\uDDF3",
  germany: "\uD83C\uDDE9\uD83C\uDDEA",
  france: "\uD83C\uDDEB\uD83C\uDDF7",
  netherlands: "\uD83C\uDDF3\uD83C\uDDF1",
  poland: "\uD83C\uDDF5\uD83C\uDDF1",
  spain: "\uD83C\uDDEA\uD83C\uDDF8",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const showSkeleton = useMinLoading(loading, 3000);

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
      const list = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data?.items || [];
      setOrders(list);
      const pending = list.filter((o: any) => o.status === "pending");
      for (const order of pending) {
        try {
          const statusRes = await axios.get(`${API_URL}/api/orders/${order.id}`, { headers });
          setOrders((prev) => prev.map((o) => (o.id === order.id ? statusRes.data : o)));
          if (["failed", "cancelled"].includes(statusRes.data.status)) {
            const freshUser = await axios.get(`${API_URL}/api/users/me`, { headers });
            setUser(freshUser.data);
          }
        } catch {}
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
    pollRef.current = setInterval(() => fetchData(true), 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

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
        return "bg-gray-500/15 text-muted border-line";
    }
  };

  if (showSkeleton) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Dashboard" />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-fg">Dashboard</h1>
            <p className="text-muted text-sm mt-0.5">
              Welcome, <span className="text-fg">{user?.username}</span>
              {user?.is_admin && (
                <span className="ml-2 badge bg-purple-500/20 text-purple-300 border border-purple-500/30">Admin</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => fetchData()} disabled={refreshing} className="btn-ghost text-sm">Refresh</button>
            <Link href="/buy" className="btn-primary text-sm">Buy Number</Link>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-medium text-fg">Recent Orders</h2>
            <span className="text-xs text-muted">{orders.length} total</span>
          </div>
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted mb-4">No orders yet</p>
              <Link href="/buy" className="btn-primary inline-flex text-sm">Buy your first number</Link>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {orders.map((order) => (
                <div key={order.id} className="px-6 py-5 hover:bg-soft/40 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl mt-0.5">{COUNTRY_FLAGS[order.country] || "\uD83C\uDF10"}</div>
                      <div>
                        <p className="font-mono font-semibold text-fg text-lg tracking-wide">{order.phone_number || "-"}</p>
                        <p className="text-sm text-muted mt-0.5 capitalize">{order.service}{" · "}{order.country}</p>
                        <p className="text-xs text-muted mt-1">${order.cost?.toFixed(4)}{" · "}{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`badge border ${statusColor(order.status)}`}>{order.status}</span>
                      {order.otp_code && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2">
                          <p className="text-xs text-blue-300/70 mb-0.5">OTP Code</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-bold text-xl text-blue-400 tracking-widest">{order.otp_code}</p>
                            <button onClick={() => copyOtp(order.id, order.otp_code)} className="text-xs text-blue-300 hover:text-fg border border-blue-500/30 px-2 py-0.5 rounded-lg">
                              {copiedId === order.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}
                      {order.status === "pending" && (
                        <button onClick={() => cancelOrder(order.id)} className="text-xs text-red-400 hover:text-red-300 mt-1">Cancel & Refund</button>
                      )}
                    </div>
                  </div>
                  {order.sms_text && <p className="mt-3 text-xs text-muted bg-soft rounded-lg p-3 font-mono">{order.sms_text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-center text-xs text-muted mt-8">Pending orders auto-refresh every 8 seconds</p>
      </main>
    </div>
  );
}
