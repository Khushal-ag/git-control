import Image from "next/image";
import Link from "next/link";

import { GitCommitHorizontal, Home } from "lucide-react";

import { ThemeSync } from "@/components/theme-sync";
import { siteConfig } from "@/config/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
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
        <p className="flex items-center justify-center gap-1.5 font-mono text-xs font-bold tracking-widest text-orange-500 uppercase">
          <GitCommitHorizontal className="size-3.5" />
          fatal: pathspec did not match any page
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight">404</h1>
        <p className="mx-auto max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          This page doesn&apos;t exist in this repository. It may have been
          moved, renamed, or never committed.
        </p>
      </div>

      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600 active:scale-95"
      >
        <Home className="size-4" />
        Back to {siteConfig.shortName}
      </Link>
    </main>
  );
}
