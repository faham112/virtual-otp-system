"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md w-full card p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          Virtual OTP
        </h1>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          Temporary numbers for receiving verification codes.<br />
          Fast, secure & multi-user ready.
        </p>

        <div className="space-y-3">
          <Link href="/login" className="block w-full btn-primary py-3.5 text-center">
            Sign In
          </Link>
          <Link
            href="/register"
            className="block w-full bg-[#12151c] hover:bg-[#1e2230] border border-[#2a2f3d] text-gray-200 font-medium py-3.5 rounded-xl transition text-center"
          >
            Create Account
          </Link>
        </div>

        <p className="mt-10 text-xs text-gray-500">
          Powered by 5sim · FastAPI · Next.js
        </p>
      </div>
    </div>
  );
}
