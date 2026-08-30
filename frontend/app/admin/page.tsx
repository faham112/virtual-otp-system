"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const BANK_FIELDS = [
  { key: "bank_local_1", label: "Local Bank 1" },
  { key: "bank_local_2", label: "Local Bank 2" },
  { key: "bank_national_1", label: "National Bank 1" },
  { key: "bank_national_2", label: "National Bank 2" },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [providerBal, setProviderBal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "orders" | "deposits" | "settings">("users");

  const [showAddBalance, setShowAddBalance] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDesc, setBalanceDesc] = useState("Admin credit");
  const [submitting, setSubmitting] = useState(false);

  const [markupValue, setMarkupValue] = useState("50");
  const [markupSaving, setMarkupSaving] = useState(false);

  const [fivesimKey, setFivesimKey] = useState("");
  const [fivesimSaving, setFivesimSaving] = useState(false);

  const [bankForm, setBankForm] = useState<Record<string, string>>({});
  const [banksSaving, setBanksSaving] = useState(false);
  const [depositActionId, setDepositActionId] = useState<number | null>(null);

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
      const meRes = await axios.get(`${API_URL}/api/users/me`, { headers });
      if (!meRes.data.is_admin) {
        router.push("/dashboard");
        return;
      }
      setUser(meRes.data);

      const [usersRes, ordersRes, settingsRes, depositsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/users`, { headers }),
        axios.get(`${API_URL}/api/admin/orders`, { headers }),
        axios.get(`${API_URL}/api/admin/settings`, { headers }),
        axios.get(`${API_URL}/api/admin/deposits`, { headers }).catch(() => ({ data: [] })),
      ]);

      setUsers(usersRes.data);
      setOrders(ordersRes.data);
      setDeposits(Array.isArray(depositsRes.data) ? depositsRes.data : []);
      setSettings(settingsRes.data || {});

      const s = settingsRes.data || {};
      if (s.markup_percent) setMarkupValue(String(s.markup_percent));
      setFivesimKey(s.fivesim_api_key ? "••••••••" + String(s.fivesim_api_key).slice(-4) : "");

      const bf: Record<string, string> = {};
      BANK_FIELDS.forEach(({ key }) => {
        bf[`${key}_name`] = s[`${key}_name`] || "";
        bf[`${key}_details`] = s[`${key}_details`] || "";
      });
      setBankForm(bf);

      try {
        const balRes = await axios.get(`${API_URL}/api/admin/fivesim-balance`, { headers });
        setProviderBal(balRes.data.balance);
      } catch {
        setProviderBal(null);
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        Cookies.remove("token");
        router.push("/login");
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
        { user_id: selectedUser.id, amount, description: balanceDesc || "Admin credit" },
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

  const handleToggleUser = async (u: any) => {
    if (u.id === user?.id) {
      alert("Cannot deactivate yourself");
      return;
    }
    const next = !u.is_active;
    if (!confirm(`${next ? "Activate" : "Deactivate"} user ${u.username}?`)) return;
    try {
      await axios.post(
        `${API_URL}/api/admin/toggle-user`,
        { user_id: u.id, is_active: next },
        { headers: getHeaders() }
      );
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
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
      alert(`Fixed system markup set to ${val}%`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update markup");
    } finally {
      setMarkupSaving(false);
    }
  };

  const handleSaveFivesimKey = async () => {
    const raw = fivesimKey.trim();
    if (!raw || raw.startsWith("••••")) {
      alert("Paste a new 5sim API key (or leave unchanged)");
      return;
    }
    setFivesimSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/admin/settings`,
        { fivesim_api_key: raw },
        { headers: getHeaders() }
      );
      alert("5sim API key saved");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save API key");
    } finally {
      setFivesimSaving(false);
    }
  };

  const handleSaveBanks = async () => {
    setBanksSaving(true);
    try {
      await axios.post(`${API_URL}/api/admin/settings`, bankForm, { headers: getHeaders() });
      alert("Bank details saved");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save banks");
    } finally {
      setBanksSaving(false);
    }
  };

  const handleDeposit = async (id: number, action: "approve" | "reject") => {
    if (action === "approve" && !confirm("Approve this deposit and credit user balance?")) return;
    if (action === "reject" && !confirm("Reject this deposit?")) return;
    setDepositActionId(id);
    try {
      await axios.post(`${API_URL}/api/admin/deposits/${id}/${action}`, {}, { headers: getHeaders() });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setDepositActionId(null);
    }
  };

  const logout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "pending":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "failed":
      case "cancelled":
      case "rejected":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/15 text-gray-400 border-gray-500/30";
    }
  };

  const totalUsers = users.length;
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const pendingDeposits = deposits.filter((d) => d.status === "pending").length;
  const totalVolume = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + (o.cost || 0), 0);
  const profitEst = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + ((o.cost || 0) - (o.provider_cost || 0)), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading Admin Panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[#0f1117]/90 backdrop-blur-xl border-b border-[#2a2f3d]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <span className="font-semibold text-white">Admin Panel</span>
            <p className="text-xs text-gray-500">Virtual OTP · Fixed markup system</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-ghost text-sm">← User Dashboard</Link>
            <button onClick={logout} className="btn-ghost text-sm text-red-400">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Users</p>
            <p className="text-2xl font-bold text-white">{totalUsers}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Orders</p>
            <p className="text-2xl font-bold text-white">{totalOrders}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Pending Orders</p>
            <p className="text-2xl font-bold text-amber-400">{pendingOrders}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Pending Deposits</p>
            <p className="text-2xl font-bold text-amber-400">{pendingDeposits}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Volume</p>
            <p className="text-2xl font-bold text-emerald-400">${totalVolume.toFixed(2)}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 mb-1">Est. Profit</p>
            <p className="text-2xl font-bold text-purple-400">${profitEst.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-[#2a2f3d] overflow-x-auto">
          {(["users", "orders", "deposits", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-xl capitalize whitespace-nowrap ${
                activeTab === tab
                  ? "bg-[#1a1d27] text-white border border-b-0 border-[#2a2f3d]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
              {tab === "deposits" && pendingDeposits > 0 && (
                <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">
                  {pendingDeposits}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-[#2a2f3d]">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2f3d]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-gray-400">{u.id}</td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{u.username}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-400">${u.balance?.toFixed(4)}</td>
                      <td className="px-4 py-3">
                        {u.is_admin ? (
                          <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30">Admin</span>
                        ) : (
                          <span className="badge bg-gray-500/20 text-gray-400 border border-gray-500/30">User</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="text-emerald-400">Active</span>
                        ) : (
                          <span className="text-red-400">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={() => openAddBalance(u)}
                          className="text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-lg"
                        >
                          + Balance
                        </button>
                        <button
                          onClick={() => handleToggleUser(u)}
                          className="text-xs bg-white/5 text-gray-300 border border-[#2a2f3d] px-2.5 py-1 rounded-lg"
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-[#2a2f3d]">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">User $</th>
                    <th className="px-4 py-3">Cost $</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">OTP</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2f3d]">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-gray-400">#{o.id}</td>
                      <td className="px-4 py-3 text-white">{o.username || o.user_id}</td>
                      <td className="px-4 py-3 font-mono text-white">{o.phone_number || "—"}</td>
                      <td className="px-4 py-3 capitalize text-gray-300">{o.service}</td>
                      <td className="px-4 py-3 font-mono text-emerald-400">${o.cost?.toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono text-gray-400">${(o.provider_cost || 0).toFixed(4)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge border ${statusColor(o.status)}`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-400">{o.otp_code || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "deposits" && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2f3d] flex justify-between items-center">
              <h2 className="font-medium text-white">Deposit Requests</h2>
              <span className="text-xs text-gray-500">{pendingDeposits} pending</span>
            </div>
            {deposits.length === 0 ? (
              <p className="p-8 text-center text-gray-500 text-sm">No deposit requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-[#2a2f3d]">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Bank</th>
                      <th className="px-4 py-3">Slip note</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2f3d]">
                    {deposits.map((d) => (
                      <tr key={d.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-gray-400">#{d.id}</td>
                        <td className="px-4 py-3 text-white">{d.username || d.user_id}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400">${Number(d.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-300">{d.bank_name || d.bank_key}</td>
                        <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate" title={d.slip_note || ""}>
                          {d.slip_note || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge border ${statusColor(d.status)}`}>{d.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {d.created_at ? new Date(d.created_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {d.status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeposit(d.id, "approve")}
                                disabled={depositActionId === d.id}
                                className="text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDeposit(d.id, "reject")}
                                disabled={depositActionId === d.id}
                                className="text-xs bg-red-600/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-lg disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">{d.admin_note || "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h2 className="font-medium text-white mb-2">Fixed Profit Markup</h2>
                <p className="text-xs text-gray-500 mb-4">
                  System-wide fixed margin. Selling price = cost × (1 + markup%). Example: $0.10 + 50% = $0.15.
                </p>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.1"
                    value={markupValue}
                    onChange={(e) => setMarkupValue(e.target.value)}
                    className="input-field flex-1"
                  />
                  <button onClick={handleSetMarkup} disabled={markupSaving} className="btn-primary px-6">
                    {markupSaving ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Current: <span className="text-white">{settings.markup_percent || "50"}%</span>
                </p>
              </div>

              <div className="card p-6">
                <h2 className="font-medium text-white mb-2">Provider Wallet</h2>
                <p className="text-3xl font-bold text-white mt-4">
                  {providerBal !== null ? `$${providerBal.toFixed(4)}` : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-2">Live 5sim balance</p>
                <p className="text-xs text-gray-500 mt-4">
                  Completed: {completedOrders} · Est. profit: ${profitEst.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Logged in as {user?.username}</p>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-medium text-white mb-2">5sim API Key</h2>
              <p className="text-xs text-gray-500 mb-4">
                Paste your 5sim Bearer token. Saved in database (overrides .env). Leave masked value if unchanged.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={fivesimKey}
                  onChange={(e) => setFivesimKey(e.target.value)}
                  onFocus={() => {
                    if (fivesimKey.startsWith("••••")) setFivesimKey("");
                  }}
                  className="input-field flex-1 font-mono text-sm"
                  placeholder="Paste new 5sim API key"
                  autoComplete="off"
                />
                <button onClick={handleSaveFivesimKey} disabled={fivesimSaving} className="btn-primary px-6">
                  {fivesimSaving ? "Saving..." : "Save Key"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {settings.fivesim_api_key ? (
                  <span className="text-emerald-400">Key is configured</span>
                ) : (
                  <span className="text-amber-400">No key set — buys will fail</span>
                )}
              </p>
            </div>

            <div className="card p-6">
              <h2 className="font-medium text-white mb-2">Bank Details (Deposit)</h2>
              <p className="text-xs text-gray-500 mb-5">
                Users see these on the Deposit page. Fill name + account details for each bank you accept.
              </p>
              <div className="space-y-6">
                {BANK_FIELDS.map(({ key, label }) => (
                  <div key={key} className="bg-[#12151c] rounded-xl p-4 border border-[#2a2f3d] space-y-3">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Display name</label>
                      <input
                        type="text"
                        value={bankForm[`${key}_name`] || ""}
                        onChange={(e) =>
                          setBankForm((prev) => ({ ...prev, [`${key}_name`]: e.target.value }))
                        }
                        className="input-field w-full text-sm"
                        placeholder={label}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Account details (title, number, IBAN, branch — one per line)
                      </label>
                      <textarea
                        rows={3}
                        value={bankForm[`${key}_details`] || ""}
                        onChange={(e) =>
                          setBankForm((prev) => ({ ...prev, [`${key}_details`]: e.target.value }))
                        }
                        className="input-field w-full text-sm font-mono"
                        placeholder={"Account Title: ...\nAccount Number: ...\nIBAN: ..."}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveBanks}
                disabled={banksSaving}
                className="btn-primary mt-5 px-8"
              >
                {banksSaving ? "Saving..." : "Save All Banks"}
              </button>
            </div>
          </div>
        )}
      </main>

      {showAddBalance && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-1">Add Balance</h3>
            <p className="text-sm text-gray-400 mb-5">
              To: <span className="text-white">{selectedUser.username}</span> (${selectedUser.balance?.toFixed(4)})
            </p>
            <div className="space-y-4">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                className="input-field"
                placeholder="Amount USD"
                autoFocus
              />
              <input
                type="text"
                value={balanceDesc}
                onChange={(e) => setBalanceDesc(e.target.value)}
                className="input-field"
                placeholder="Description"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddBalance(false)} className="flex-1 bg-[#12151c] border border-[#2a2f3d] text-gray-300 py-2.5 rounded-xl">
                Cancel
              </button>
              <button onClick={handleAddBalance} disabled={submitting} className="flex-1 btn-primary">
                {submitting ? "Adding..." : "Add Balance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
