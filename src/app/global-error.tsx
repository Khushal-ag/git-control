"use client";

import { useEffect } from "react";

import { AlertOctagon, RotateCcw } from "lucide-react";

import "@/styles/globals.css";

// Renders only when the root layout itself throws, so it must supply its
// own <html>/<body> — the normal layout is bypassed entirely. Kept minimal
// and dependency-free (no fonts, no theme sync) since this is the
// last-resort fallback and shouldn't assume anything else still works.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("GitControl critical error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center text-zinc-900 antialiased">
        <div className="space-y-2">
          <p className="flex items-center justify-center gap-1.5 font-mono text-xs font-bold tracking-widest text-rose-500 uppercase">
            <AlertOctagon className="size-3.5" />
            fatal: application crashed
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            GitControl failed to load
          </h1>
          <p className="mx-auto max-w-sm text-sm text-zinc-500">
            A critical error stopped the app from starting. Reloading usually
            fixes this.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 active:scale-95"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600 active:scale-95"
          >
            <RotateCcw className="size-4" />
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
