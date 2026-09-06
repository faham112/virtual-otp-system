import Link from "next/link";
import LegalFrame, { LEGAL_PAGES } from "../components/LegalFrame";

export default function LegalIndexPage() {
  const pages = LEGAL_PAGES.filter((p) => p.href !== "/legal");
  return (
    <LegalFrame current="/legal" title="Site pages">
      <div className="card p-5 sm:p-6 space-y-4">
        <p className="text-sm text-muted">
          These pages sit under <span className="text-fg">Pages</span> in the sidebar (below Logout) and in the footer.
          Open any card below.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {pages.map((p) => (
            <Link key={p.href} href={p.href} className="panel p-4 hover:border-blue-500/40 transition">
              <p className="text-fg font-medium">{p.label}</p>
              <p className="text-xs text-muted mt-1">{p.hint}</p>
              <p className="text-[11px] text-blue-500 mt-2">{p.href}</p>
            </Link>
          ))}
        </div>
      </div>
    </LegalFrame>
  );
}
