"use client";

import { useEffect, useRef, useState } from "react";

/** Show skeleton until `loading` is false AND at least `minMs` have passed (default 3s). */
export function useMinLoading(loading: boolean, minMs = 3000): boolean {
  const [show, setShow] = useState(true);
  const started = useRef(Date.now());

  useEffect(() => {
    started.current = Date.now();
    setShow(true);
  }, []);

  useEffect(() => {
    if (loading) {
      setShow(true);
      return;
    }
    const elapsed = Date.now() - started.current;
    const left = Math.max(0, minMs - elapsed);
    const t = setTimeout(() => setShow(false), left);
    return () => clearTimeout(t);
  }, [loading, minMs]);

  return show;
}

export function PageSkeleton({
  title = "Loading",
  lines = 5,
}: {
  title?: string;
  lines?: number;
}) {
  return (
    <div className="min-h-screen">
      <div className="app-header">
        <div className="px-3 sm:px-4 py-3 flex items-center gap-2.5">
          <div className="skeleton h-10 w-10 rounded-xl shrink-0" />
          <div className="skeleton h-5 flex-1 max-w-[8rem] rounded-md" />
          <div className="skeleton h-8 w-8 rounded-xl shrink-0" />
          <div className="skeleton h-8 w-16 rounded-lg shrink-0" />
        </div>
      </div>
      <main className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="card p-6 space-y-4">
          <div className="skeleton h-6 w-40 rounded-md" />
          <div className="skeleton h-4 w-full max-w-xs rounded-md" />
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full rounded-xl" />
          ))}
          <div className="skeleton h-12 w-full rounded-xl mt-2" />
        </div>
        <p className="text-center text-xs text-muted animate-pulse">{title}…</p>
      </main>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="app-header">
        <div className="px-3 sm:px-4 py-3 flex items-center gap-2.5">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="skeleton h-5 w-28 rounded-md" />
          <div className="flex-1" />
          <div className="skeleton h-8 w-8 rounded-xl" />
          <div className="skeleton h-8 w-20 rounded-lg" />
        </div>
      </div>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between gap-4 mb-8">
          <div className="space-y-2">
            <div className="skeleton h-7 w-36 rounded-md" />
            <div className="skeleton h-4 w-48 rounded-md" />
          </div>
          <div className="skeleton h-10 w-28 rounded-xl" />
        </div>
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-line">
            <div className="skeleton h-5 w-32 rounded-md" />
          </div>
          <div className="divide-y divide-[color:var(--border)]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-6 py-5 flex gap-4">
                <div className="skeleton h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-40 rounded-md" />
                  <div className="skeleton h-3 w-56 rounded-md" />
                  <div className="skeleton h-3 w-28 rounded-md" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
