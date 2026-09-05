"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const BANK_FIELDS = [
  { key: "bank_local_1", label: "Local Bank 1" },
  { key: "bank_local_2", label: "Local Bank 2" },
  { key: "bank_national_1", label: "National Bank 1" },
  { key: "bank_national_2", label: "National Bank 2" },
];

const TABS = [
  { id: "users", label: "Users", emoji: "\uD83D\uDC65" },
  { id: "orders", label: "Orders", emoji: "\uD83D\uDCF1" },
  { id: "deposits", label: "Deposits", emoji: "\uD83D\uDCB0" },
  { id: "settings", label: "Settings", emoji: "\u2699\uFE0F" },
] as const;

function statusEmoji(status: string) {
  if (status === "completed" || status === "approved") return "\u2705";
  if (status === "pending") return "\u23F3";
  if (status === "cancelled") return "\uD83D\uDED1";
  if (status === "failed" || status === "rejected") return "\u274C";
  return "\u2022";
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [providerBal, setProviderBal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("orders");
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
  const [wa1, setWa1] = useState("");
  const [wa2, setWa2] = useState("");
  const [waSaving, setWaSaving] = useState(false);

  const getHeaders = () => ({ Authorization: `Bearer ${Cookies.get("token")}` });

  const fetchData = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) { router.push("/login"); return; }
    try {
      const headers = getHeaders();
      const meRes = await axios.get(`${API_URL}/api/users/me`, { headers });
      if (!meRes.data.is_admin) { router.push("/dashboard"); return; }
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
      setFivesimKey(s.fivesim_api_key ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + String(s.fivesim_api_key).slice(-4) : "");
      const bf: Record<string, string> = {};
      BANK_FIELDS.forEach(({ key }) => {
        bf[`${key}_name`] = s[`${key}_name`] || "";
        bf[`${key}_details`] = s[`${key}_details`] || "";
      });
      setBankForm(bf);
      setWa1(s.admin_whatsapp || "");
      setWa2(s.admin_whatsapp_2 || "");
      try {
        const balRes = await axios.get(`${API_URL}/api/admin/provider-balance`, { headers });
        setProviderBal(typeof balRes.data?.balance === "number" ? balRes.data.balance : null);
      } catch {
        try {
          const balRes = await axios.get(`${API_URL}/api/admin/fivesim-balance`, { headers });
          setProviderBal(balRes.data.balance);
        } catch { setProviderBal(null); }
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        Cookies.remove("token");
        router.push("/login");
      }
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAddBalance = (u: any) => { setSelectedUser(u); setBalanceAmount(""); setBalanceDesc("Admin credit"); setShowAddBalance(true); };

  const handleAddBalance = async () => {
    if (!selectedUser || !balanceAmount) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) { alert("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/admin/add-balance`, { user_id: selectedUser.id, amount, description: balanceDesc || "Admin credit" }, { headers: getHeaders() });
      setShowAddBalance(false);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed to add balance"); }
    finally { setSubmitting(false); }
  };

  const handleToggleUser = async (u: any) => {
    if (u.id === user?.id) { alert("Cannot deactivate yourself"); return; }
    const next = !u.is_active;
    if (!confirm(`${next ? "Activate" : "Deactivate"} user ${u.username}?`)) return;
    try {
      await axios.post(`${API_URL}/api/admin/toggle-user`, { user_id: u.id, is_active: next }, { headers: getHeaders() });
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed"); }
  };

  const handleSetMarkup = async () => {
    const val = parseFloat(markupValue);
    if (isNaN(val) || val < 0 || val > 500) { alert("Markup must be between 0 and 500"); return; }
    setMarkupSaving(true);
    try {
      await axios.post(`${API_URL}/api/admin/set-markup`, { markup_percent: val }, { headers: getHeaders() });
      alert(`Markup saved: ${val}%`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed to update markup"); }
    finally { setMarkupSaving(false); }
  };

  const handleSaveFivesimKey = async () => {
    const raw = fivesimKey.trim();
    if (!raw || raw.startsWith("\u2022")) { alert("Paste a new API key"); return; }
    setFivesimSaving(true);
    try {
      await axios.post(`${API_URL}/api/admin/settings`, { fivesim_api_key: raw }, { headers: getHeaders() });
      alert("API key saved");
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed to save API key"); }
    finally { setFivesimSaving(false); }
  };

  const handleSaveBanks = async () => {
    setBanksSaving(true);
    try {
      await axios.post(`${API_URL}/api/admin/settings`, bankForm, { headers: getHeaders() });
      alert("Bank details saved");
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed to save banks"); }
    finally { setBanksSaving(false); }
  };

  const handleSaveWhatsApp = async () => {
    setWaSaving(true);
    try {
      await axios.post(`${API_URL}/api/admin/settings`, { admin_whatsapp: wa1.trim(), admin_whatsapp_2: wa2.trim() }, { headers: getHeaders() });
      alert("WhatsApp numbers saved");
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed to save WhatsApp"); }
    finally { setWaSaving(false); }
  };

  const handleDeposit = async (id: number, action: "approve" | "reject") => {
    if (!confirm(`${action === "approve" ? "Approve and credit" : "Reject"} this deposit?`)) return;
    setDepositActionId(id);
    try {
      await axios.post(`${API_URL}/api/admin/deposits/${id}/${action}`, {}, { headers: getHeaders() });
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || `Failed to ${action}`); }
    finally { setDepositActionId(null); }
  };

  const statusClass = (status: string) => {
    if (status === "completed" || status === "approved") return "text-emerald-500";
    if (status === "pending") return "text-amber-500";
    return "text-red-400";
  };

  const pendingDeposits = deposits.filter((d) => d.status === "pending").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const totalVolume = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.cost || 0), 0);
  const profitEst = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + ((o.cost || 0) - (o.provider_cost || 0)), 0);

  if (loading) {
    return <div className="py-16 text-center text-muted text-sm">Loading admin...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Stat emoji="\uD83D\uDC65" label="Users" value={String(users.length)} />
        <Stat emoji="\uD83D\uDCF1" label="Orders" value={String(orders.length)} />
        <Stat emoji="\u23F3" label="Pending" value={String(pendingOrders)} />
        <Stat emoji="\uD83D\uDCB3" label="Deposits" value={String(pendingDeposits)} />
        <Stat emoji="\uD83D\uDCB5" label="Volume" value={`$${totalVolume.toFixed(2)}`} />
        <Stat emoji="\uD83D\uDCB0" label="Profit" value={`$${profitEst.toFixed(2)}`} />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium ${
              activeTab === tab.id ? "bg-card border border-line text-fg" : "text-muted"
            }`}
          >
            {tab.emoji} {tab.label}
            {tab.id === "deposits" && pendingDeposits > 0 ? ` ${pendingDeposits}` : ""}
          </button>
        ))}
      </div>

      {activeTab === "users" && (
        <div className="space-y-3 md:space-y-0 md:card md:overflow-x-auto">
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <div key={u.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-fg">{u.is_admin ? "\uD83D\uDEE1\uFE0F " : "\uD83D\uDC64 "}{u.username}</p>
                    <p className="text-xs text-muted break-all">{u.email}</p>
                  </div>
                  <p className="text-emerald-500 font-mono text-sm">${Number(u.balance || 0).toFixed(2)}</p>
                </div>
                <p className="text-xs text-muted">{u.is_active ? "\uD83D\uDFE2 Active" : "\uD83D\uDD34 Inactive"}</p>
                <div className="flex gap-2">
                  <button onClick={() => openAddBalance(u)} className="text-xs btn-primary py-1.5 px-3">+ Balance</button>
                  <button onClick={() => handleToggleUser(u)} className="text-xs border border-line rounded-lg px-3 py-1.5">{u.is_active ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden md:table w-full text-sm min-w-[720px]">
            <thead><tr className="text-left text-muted border-b border-line">
              <th className="p-3 whitespace-nowrap">ID</th>
              <th className="p-3 whitespace-nowrap">User</th>
              <th className="p-3 whitespace-nowrap">Balance</th>
              <th className="p-3 whitespace-nowrap">Role</th>
              <th className="p-3 whitespace-nowrap">Status</th>
              <th className="p-3 whitespace-nowrap">Actions</th>
            </tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="p-3 whitespace-nowrap text-muted">{u.id}</td>
                  <td className="p-3"><p className="text-fg font-medium">{u.username}</p><p className="text-xs text-muted">{u.email}</p></td>
                  <td className="p-3 whitespace-nowrap font-mono text-emerald-500">${Number(u.balance || 0).toFixed(4)}</td>
                  <td className="p-3 whitespace-nowrap">{u.is_admin ? "Admin" : "User"}</td>
                  <td className="p-3 whitespace-nowrap">{u.is_active ? "Active" : "Inactive"}</td>
                  <td className="p-3 whitespace-nowrap">
                    <button onClick={() => openAddBalance(u)} className="text-xs text-blue-500 mr-2">+ Balance</button>
                    <button onClick={() => handleToggleUser(u)} className="text-xs text-muted">{u.is_active ? "Off" : "On"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="space-y-3 md:card md:overflow-x-auto">
          <div className="md:hidden space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">#{o.id} \u00b7 {o.username || o.user_id}</p>
                    <p className="font-semibold text-fg capitalize">\uD83D\uDCF1 {o.service}</p>
                    <p className="font-mono text-sm text-fg break-all">{o.phone_number || "No number"}</p>
                  </div>
                  <p className={`text-xs font-medium ${statusClass(o.status)}`}>{statusEmoji(o.status)} {o.status}</p>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Sell ${Number(o.cost || 0).toFixed(4)}</span>
                  <span>Cost ${Number(o.provider_cost || 0).toFixed(4)}</span>
                </div>
                <p className="font-mono text-sm text-blue-500">{o.otp_code ? `OTP ${o.otp_code}` : "OTP pending"}</p>
                <p className="text-[11px] text-muted">{o.created_at ? new Date(o.created_at).toLocaleString() : ""}</p>
              </div>
            ))}
          </div>
          <table className="hidden md:table w-full text-sm min-w-[900px]">
            <thead><tr className="text-left text-muted border-b border-line">
              <th className="p-3 whitespace-nowrap">ID</th>
              <th className="p-3 whitespace-nowrap">User</th>
              <th className="p-3 whitespace-nowrap">Phone</th>
              <th className="p-3 whitespace-nowrap">Service</th>
              <th className="p-3 whitespace-nowrap">Sell</th>
              <th className="p-3 whitespace-nowrap">Cost</th>
              <th className="p-3 whitespace-nowrap">Status</th>
              <th className="p-3 whitespace-nowrap">OTP</th>
              <th className="p-3 whitespace-nowrap">Date</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="p-3 whitespace-nowrap text-muted">#{o.id}</td>
                  <td className="p-3 whitespace-nowrap text-fg">{o.username || o.user_id}</td>
                  <td className="p-3 whitespace-nowrap font-mono text-fg">{o.phone_number || "\u2014"}</td>
                  <td className="p-3 whitespace-nowrap capitalize">{o.service}</td>
                  <td className="p-3 whitespace-nowrap font-mono text-emerald-500">${Number(o.cost || 0).toFixed(4)}</td>
                  <td className="p-3 whitespace-nowrap font-mono text-muted">${Number(o.provider_cost || 0).toFixed(4)}</td>
                  <td className={`p-3 whitespace-nowrap ${statusClass(o.status)}`}>{statusEmoji(o.status)} {o.status}</td>
                  <td className="p-3 whitespace-nowrap font-mono">{o.otp_code || "\u2014"}</td>
                  <td className="p-3 whitespace-nowrap text-xs text-muted">{o.created_at ? new Date(o.created_at).toLocaleString() : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "deposits" && (
        <div className="space-y-3">
          {deposits.length === 0 && <p className="text-sm text-muted">No deposit requests yet.</p>}
          {deposits.map((d) => (
            <div key={d.id} className="card p-4 space-y-2">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-fg">\uD83D\uDCB0 {d.username || d.user_id}</p>
                  <p className="text-xs text-muted break-words">{d.slip_note || d.bank_name}</p>
                </div>
                <p className="font-mono text-emerald-500">${Number(d.amount).toFixed(4)}</p>
              </div>
              <p className={`text-xs ${statusClass(d.status)}`}>{statusEmoji(d.status)} {d.status}</p>
              {d.status === "pending" && (
                <div className="flex gap-2">
                  <button disabled={depositActionId === d.id} onClick={() => handleDeposit(d.id, "approve")} className="text-xs btn-primary py-1.5 px-3">Approve</button>
                  <button disabled={depositActionId === d.id} onClick={() => handleDeposit(d.id, "reject")} className="text-xs border border-line rounded-lg px-3 py-1.5 text-red-400">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-medium text-fg mb-2">\uD83D\uDCB0 Markup %</h2>
            <div className="flex gap-3">
              <input type="number" min="0" max="500" step="0.1" value={markupValue} onChange={(e) => setMarkupValue(e.target.value)} className="input-field flex-1" />
              <button onClick={handleSetMarkup} disabled={markupSaving} className="btn-primary">{markupSaving ? "Saving..." : "Save"}</button>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-medium text-fg mb-2">\uD83D\uDCB3 Provider wallet</h2>
            <p className="text-3xl font-bold text-fg">{providerBal !== null ? `$${providerBal.toFixed(4)}` : "\u2014"}</p>
            <p className="text-xs text-muted mt-2">Completed {completedOrders} \u00b7 Profit ${profitEst.toFixed(2)}</p>
          </div>
          <div className="card p-5">
            <h2 className="font-medium text-fg mb-2">\uD83D\uDD11 Fallback API key</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={fivesimKey} onChange={(e) => setFivesimKey(e.target.value)} onFocus={() => { if (fivesimKey.startsWith("\u2022")) setFivesimKey(""); }} className="input-field flex-1 font-mono text-sm" placeholder="Paste key" />
              <button onClick={handleSaveFivesimKey} disabled={fivesimSaving} className="btn-primary">{fivesimSaving ? "Saving..." : "Save"}</button>
            </div>
          </div>
          <div className="card p-5 space-y-3">
            <h2 className="font-medium text-fg">\uD83D\uDCAC Admin WhatsApp</h2>
            <input type="text" value={wa1} onChange={(e) => setWa1(e.target.value)} className="input-field font-mono text-sm" placeholder="923001234567" />
            <input type="text" value={wa2} onChange={(e) => setWa2(e.target.value)} className="input-field font-mono text-sm" placeholder="Second number optional" />
            <button onClick={handleSaveWhatsApp} disabled={waSaving} className="btn-primary">{waSaving ? "Saving..." : "Save WhatsApp"}</button>
          </div>
          <div className="card p-5 space-y-4">
            <h2 className="font-medium text-fg">\uD83C\uDFE6 Banks</h2>
            {BANK_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-2 border border-line rounded-xl p-3">
                <p className="text-sm font-medium text-fg">{label}</p>
                <input type="text" value={bankForm[`${key}_name`] || ""} onChange={(e) => setBankForm((prev) => ({ ...prev, [`${key}_name`]: e.target.value }))} className="input-field text-sm" placeholder={label} />
                <textarea rows={3} value={bankForm[`${key}_details`] || ""} onChange={(e) => setBankForm((prev) => ({ ...prev, [`${key}_details`]: e.target.value }))} className="input-field text-sm font-mono" placeholder="Account details" />
              </div>
            ))}
            <button onClick={handleSaveBanks} disabled={banksSaving} className="btn-primary">{banksSaving ? "Saving..." : "Save banks"}</button>
          </div>
        </div>
      )}

      {showAddBalance && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
          <div className="card w-full max-w-md p-5">
            <h3 className="text-lg font-semibold text-fg mb-1">Add balance</h3>
            <p className="text-sm text-muted mb-4">To {selectedUser.username}</p>
            <input type="number" min="0.01" step="0.01" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} className="input-field mb-3" placeholder="Amount USD" />
            <input type="text" value={balanceDesc} onChange={(e) => setBalanceDesc(e.target.value)} className="input-field" placeholder="Description" />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddBalance(false)} className="flex-1 border border-line rounded-xl py-2.5">Cancel</button>
              <button onClick={handleAddBalance} disabled={submitting} className="flex-1 btn-primary">{submitting ? "Adding..." : "Add"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] text-muted">{emoji} {label}</p>
      <p className="text-lg sm:text-xl font-bold text-fg mt-1 truncate">{value}</p>
    </div>
  );
}
