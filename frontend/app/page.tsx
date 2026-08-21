"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Virtual OTP System
        </h1>
        <p className="text-gray-500 mb-8">
          Temporary numbers for receiving OTP codes
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 rounded-lg transition"
          >
            Create Account
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Powered by 5sim + FastAPI
        </p>
      </div>
    </div>
  );
}
