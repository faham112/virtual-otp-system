import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://otp.globalcareerhub.org";

async function load(id: string, token: string) {
  const res = await fetch(`${API_URL}/api/public/proof-data/${id}/${token}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; token: string }> }): Promise<Metadata> {
  const { id, token } = await params;
  const data = await load(id, token);
  if (!data) return { title: "Deposit proof" };
  const title = `Deposit $${Number(data.amount).toFixed(2)} USD · ${data.username}`;
  const desc = `${data.bank_name} · ${data.status} · Request #${data.id}`;
  const image = data.slip_url || `${SITE}/api/public/slip/${id}/${token}`;
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `${SITE}/proof/${id}/${token}`,
      type: "website",
      images: data.has_slip ? [{ url: image, width: 800, height: 1000 }] : [],
    },
  };
}

export default async function ProofPage({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params;
  const data = await load(id, token);
  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-gray-400">Receipt link expired or invalid.</p>
      </main>
    );
  }
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto card p-5 space-y-3">
        <p className="text-xs text-gray-500">Virtual OTP · USD deposit receipt</p>
        <p className="text-3xl font-bold text-emerald-400">${Number(data.amount).toFixed(2)} USD</p>
        <p className="text-sm text-gray-300">User: <span className="text-white">{data.username}</span></p>
        <p className="text-sm text-gray-300">Bank: {data.bank_name}</p>
        <p className="text-sm text-gray-300">Status: {data.status}</p>
        {data.slip_note && <p className="text-xs text-gray-500">{data.slip_note}</p>}
        {data.has_slip && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.slip_url} alt="Payment receipt" className="w-full rounded-xl border border-[#2a2f3d]" />
        )}
      </div>
    </main>
  );
}
