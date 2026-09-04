export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-[#2a2f3d] bg-[#0b0d12]/90 px-4 py-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <p className="text-[11px] text-gray-500">
          © {year} Virtual OTP. All rights reserved.
        </p>
        <p className="text-[11px] text-gray-500">
          Coded by <span className="text-gray-300">Faham Baloch</span>
        </p>
      </div>
    </footer>
  );
}
