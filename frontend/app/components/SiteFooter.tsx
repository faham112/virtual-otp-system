export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-line bg-header px-4 py-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <p className="text-[11px] text-muted">
          © {year} Virtual OTP. All rights reserved.
        </p>
        <p className="text-[11px] text-muted">
          Coded by <span className="text-fg">Faham Baloch</span>
        </p>
      </div>
    </footer>
  );
}
