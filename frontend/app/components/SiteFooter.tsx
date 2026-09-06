import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-line bg-header px-4 py-6">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-2 text-center">
        <p className="text-[11px] text-muted">© {year} Virtual OTP. All rights reserved.</p>
        <p className="text-[11px] text-muted">
          Coded by <span className="text-fg font-medium">Faham Baloch</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px] text-muted">
          <Link href="/terms" className="hover:text-fg">Terms</Link>
          <Link href="/privacy" className="hover:text-fg">Privacy</Link>
          <Link href="/faq" className="hover:text-fg">FAQ</Link>
          <Link href="/contact" className="hover:text-fg">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
