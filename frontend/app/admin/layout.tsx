import AppHeader from "../components/AppHeader";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader title="Admin" />
      <div className="max-w-6xl mx-auto px-4 pt-3">
        <Link href="/admin/providers" className="text-xs text-emerald-400 hover:underline">Provider API Keys →</Link>
      </div>
      {children}
    </>
  );
}
