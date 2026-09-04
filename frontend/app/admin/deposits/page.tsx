"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import AdminShell from "../../components/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminDepositsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [pick, setPick] = useState<any>(null);
  const [credit, setCredit] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) return;
    const res = await axios.get(`${API_URL}/api/admin/deposits`, { headers: { Authorization: `Bearer ${token}` } });
    setRows(Array.isArray(res.data) ? res.data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (d: any) => {
    setPick(d);
    setCredit(String(Number(d.amount || 0).toFixed(4)));
  };

  const approve = async () => {
    if (!pick) return;
    const amt = parseFloat(credit);
    if (!amt || amt <= 0) { alert("Enter a valid USDT amount"); return; }
    setBusy(true);
    try {
      await axios.post(`${API_URL}/api/admin/deposits/${pick.id}/approve`, { amount: amt }, { headers: { Authorization: `Bearer ${Cookies.get("token")}` } });
      setPick(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Approve failed");
    } finally { setBusy(false); }
  };

  const reject = async (id: number) => {
    if (!confirm("Reject this deposit?")) return;
    await axios.post(`${API_URL}/api/admin/deposits/${id}/reject`, {}, { headers: { Authorization: `Bearer ${Cookies.get("token")}` } });
    setPick(null);
    load();
  };

  return (
    <>
      <AdminShell>
        <main className="max-w-5xl mx-auto py-6 space-y-4">
          <h1 className="text-white font-semibold">Deposit requests</h1>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b border-white/10">
                <th className="p-3">User</th><th className="p-3">Requested</th><th className="p-3">Detail</th><th className="p-3">Status</th><th className="p-3"></th>
              </tr></thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="p-3 text-white">{d.username}</td>
                    <td className="p-3 text-emerald-400 font-mono">${Number(d.amount).toFixed(4)} USDT</td>
                    <td className="p-3 text-slate-400 text-xs">{d.slip_note}<div>{d.bank_name}</div></td>
                    <td className="p-3">{d.status}</td>
                    <td className="p-3">
                      {d.status === "pending" && <button className="text-xs text-violet-300" onClick={() => open(d)}>Review</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </AdminShell>

      {pick && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/70" onClick={() => setPick(null)} />
          <div className="relative w-full max-w-md card p-5 space-y-3">
            <p className="text-white font-semibold">Approve deposit #{pick.id}</p>
            <p className="text-sm text-slate-300">User: <b className="text-white">{pick.username}</b></p>
            <p className="text-sm text-slate-300">Bank: {pick.bank_name}</p>
            <p className="text-sm text-slate-400">{pick.slip_note}</p>
            <p className="text-sm text-amber-300">Requested: ${Number(pick.amount).toFixed(4)} USDT</p>
            {pick.proof_url && <a href={pick.proof_url} target="_blank" className="text-xs text-blue-400">Open receipt card</a>}
            <label className="block text-xs text-slate-400">Credit USDT (edit if the rate moved)</label>
            <input className="input-field" value={credit} onChange={(e) => setCredit(e.target.value)} />
            <div className="flex gap-2">
              <button disabled={busy} onClick={approve} className="btn-primary flex-1">Approve and credit</button>
              <button disabled={busy} onClick={() => reject(pick.id)} className="flex-1 rounded-xl border border-red-500/30 text-red-300">Reject</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
