"use client";

import { useEffect } from "react";
import Image from "next/image";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { ThemeSync } from "@/components/theme-sync";
import { siteConfig } from "@/config/site";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("GitControl runtime error:", error);
  }, [error]);

  return (
    <main className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      <ThemeSync />
      <Image
        src="/icon.png"
        alt={siteConfig.shortName}
        width={48}
        height={48}
        className="rounded-xl shadow-md shadow-orange-500/10"
      />

      <div className="space-y-2">
        <p className="flex items-center justify-center gap-1.5 font-mono text-xs font-bold tracking-widest text-rose-500 uppercase">
          <AlertTriangle className="size-3.5" />
          fatal: unhandled exception
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          The workspace hit a snag
        </h1>
        <p className="mx-auto max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Something crashed while rendering. Your repository only lives in this
          browser tab, so reloading is the fastest way back. You&apos;ll just
          lose the current sandbox/lesson progress.
        </p>
        {error.message && (
          <p className="mx-auto max-w-sm truncate rounded border border-zinc-200 bg-zinc-100 px-2 py-1 font-mono text-xxs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            {error.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Try Again
        </button>
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600 active:scale-95"
        >
          <RotateCcw className="size-4" />
          Reload Workspace
        </button>
      </div>
    </main>
  );
}
