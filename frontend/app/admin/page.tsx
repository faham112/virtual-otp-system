"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "orders" | "settings">("users");

  // Add Balance modal
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDesc, setBalanceDesc] = useState("Admin credit");
  const [submitting, setSubmitting] = useState(false);

  // Markup
  const [markupValue, setMarkupValue] = useState("50");
  const [markupSaving, setMarkupSaving] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${Cookies.get("token")}`,
  });

  const fetchData = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const headers = getHeaders();

      // First check current user is admin
      const meRes = await axios.get(`${API_URL}/api/users/me`, { headers });
      if (!meRes.data.is_admin) {
        router.push("/dashboard");
        return;
      }
      setUser(meRes.data);

      // Parallel fetch admin data
      const [usersRes, ordersRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/users`, { headers }),
        axios.get(`${API_URL}/api/admin/orders`, { headers }),
        axios.get(`${API_URL}/api/admin/settings`, { headers }),
      ]);

      setUsers(usersRes.data);
      setOrders(ordersRes.data);
      setSettings(settingsRes.data);

      if (settingsRes.data.markup_percent) {
        setMarkupValue(settingsRes.data.markup_percent);
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        Cookies.remove("token");
        router.push("/login");
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddBalance = (u: any) => {
    setSelectedUser(u);
    setBalanceAmount("");
    setBalanceDesc("Admin credit");
    setShowAddBalance(true);
  };

  const handleAddBalance = async () => {
    if (!selectedUser || !balanceAmount) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/admin/add-balance`,
        {
          user_id: selectedUser.id,
          amount,
          description: balanceDesc || "Admin credit",
        },
        { headers: getHeaders() }
      );
      setShowAddBalance(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add balance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetMarkup = async () => {
    const val = parseFloat(markupValue);
    if (isNaN(val) || val < 0 || val > 500) {
      alert("Markup must be between 0 and 500");
      return;
    }

    setMarkupSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/admin/set-markup`,
        { markup_percent: val },
        { headers: getHeaders() }
      );
      alert(`Markup updated to ${val}%`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update markup");
    } finally {
      setMarkupSaving(false);
    }
  };

  const logout = () => {
    Cookies.remove("token");
    router.push("/login");
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

  // Stats
  const totalUsers = users.length;
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const totalVolume = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + (o.cost || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-purple-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0f1117]/90 backdrop-blur-xl border-b border-[#2a2f3d]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-white">Admin Panel</span>
              <p className="text-xs text-gray-500">Virtual OTP System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-ghost text-sm">
              ← User Dashboard
            </Link>
            <button onClick={logout} className="btn-ghost text-sm text-red-400 hover:text-red-300">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-white">{totalUsers}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-white">{totalOrders}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-400">{pendingOrders}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Completed Volume</p>
            <p className="text-2xl font-bold text-emerald-400">${totalVolume.toFixed(2)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2a2f3d] pb-px">
          {(["users", "orders", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-xl transition ${
                activeTab === tab
                  ? "bg-[#1a1d27] text-white border border-b-0 border-[#2a2f3d]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab === "users" && "Users"}
              {tab === "orders" && "All Orders"}
              {tab === "settings" && "Settings"}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2a2f3d] flex items-center justify-between">
              <h2 className="font-medium text-white">All Users</h2>
              <span className="text-xs text-gray-500">{users.length} users</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-[#2a2f3d]">
                    <th className="px-6 py-3 font-medium">ID</th>
                    <th className="px-6 py-3 font-medium">Username</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Balance</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Joined</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2f3d]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-3.5 text-gray-400">{u.id}</td>
                      <td className="px-6 py-3.5 font-medium text-white">{u.username}</td>
                      <td className="px-6 py-3.5 text-gray-400">{u.email}</td>
                      <td className="px-6 py-3.5 font-mono text-emerald-400">
                        ${u.balance?.toFixed(4)}
                      </td>
                      <td className="px-6 py-3.5">
                        {u.is_admin ? (
                          <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Admin
                          </span>
                        ) : (
                          <span className="badge bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {u.is_active ? (
                          <span className="text-emerald-400">Active</span>
                        ) : (
                          <span className="text-red-400">Inactive</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <button
                          onClick={() => openAddBalance(u)}
                          className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg transition"
                        >
                          + Balance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2a2f3d] flex items-center justify-between">
              <h2 className="font-medium text-white">All Orders</h2>
              <span className="text-xs text-gray-500">{orders.length} orders</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-[#2a2f3d]">
                    <th className="px-6 py-3 font-medium">ID</th>
                    <th className="px-6 py-3 font-medium">Phone</th>
                    <th className="px-6 py-3 font-medium">Service</th>
                    <th className="px-6 py-3 font-medium">Country</th>
                    <th className="px-6 py-3 font-medium">Cost</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">OTP</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2f3d]">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-3.5 text-gray-400">#{o.id}</td>
                      <td className="px-6 py-3.5 font-mono text-white">
                        {o.phone_number || "—"}
                      </td>
                      <td className="px-6 py-3.5 capitalize text-gray-300">{o.service}</td>
                      <td className="px-6 py-3.5 capitalize text-gray-400">{o.country}</td>
                      <td className="px-6 py-3.5 font-mono text-emerald-400">
                        ${o.cost?.toFixed(4)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`badge border ${statusColor(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-blue-400">
                        {o.otp_code || "—"}
                      </td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="card p-6 max-w-lg">
            <h2 className="font-medium text-white mb-6">System Settings</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Markup Percentage (%)
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.1"
                    value={markupValue}
                    onChange={(e) => setMarkupValue(e.target.value)}
                    className="input-field flex-1"
                    placeholder="50"
                  />
                  <button
                    onClick={handleSetMarkup}
                    disabled={markupSaving}
                    className="btn-primary px-6"
                  >
                    {markupSaving ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Current: <span className="text-white">{settings.markup_percent || "50"}%</span>
                  <br />
                  Example: Provider cost $0.10 → User pays $0.15 (at 50% markup)
                </p>
              </div>

              <div className="pt-4 border-t border-[#2a2f3d]">
                <p className="text-sm text-gray-400">
                  Logged in as <span className="text-white font-medium">{user?.username}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Completed orders: {completedOrders} · Pending: {pendingOrders}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Balance Modal */}
      {showAddBalance && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-1">Add Balance</h3>
            <p className="text-sm text-gray-400 mb-5">
              To: <span className="text-white">{selectedUser.username}</span> (current: $
              {selectedUser.balance?.toFixed(4)})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Amount (USD)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="input-field"
                  placeholder="10.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                <input
                  type="text"
                  value={balanceDesc}
                  onChange={(e) => setBalanceDesc(e.target.value)}
                  className="input-field"
                  placeholder="Admin credit"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddBalance(false)}
                className="flex-1 bg-[#12151c] hover:bg-[#1e2230] border border-[#2a2f3d] text-gray-300 py-2.5 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBalance}
                disabled={submitting}
                className="flex-1 btn-primary"
              >
                {submitting ? "Adding..." : "Add Balance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
