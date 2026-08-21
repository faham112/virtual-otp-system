"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [userRes, ordersRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/me`, { headers }),
          axios.get(`${API_URL}/api/orders/`, { headers }),
        ]);

        setUser(userRes.data);
        setOrders(ordersRes.data);
      } catch (err) {
        Cookies.remove("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const logout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Virtual OTP</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Balance: <strong>${user?.balance?.toFixed(2)}</strong>
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <Link
            href="/buy"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            + Buy Number
          </Link>
        </div>

        {/* Orders */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-medium">Recent Orders</h3>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No orders yet. Buy your first number!
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="px-6 py-4 flex justify-between items-center hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{order.phone_number || "—"}</p>
                    <p className="text-sm text-gray-500">
                      {order.service} • {order.country}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : order.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {order.status}
                    </span>
                    {order.otp_code && (
                      <p className="mt-1 font-mono font-bold text-lg text-blue-600">
                        {order.otp_code}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
