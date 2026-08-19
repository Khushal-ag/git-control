"use client";

import { useEffect } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { CommitGraph } from "@/components/workspace/CommitGraph";
import { ConflictResolver } from "@/components/workspace/ConflictResolver";
import { FileExplorer } from "@/components/workspace/FileExplorer";
import { GitTerminal } from "@/components/workspace/GitTerminal";
import { LessonPanel } from "@/components/workspace/LessonPanel";
import { useGitStore } from "@/store/git-store";

export default function App() {
  const { undo, redo, theme } = useGitStore();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      useGitStore.setState({ theme: savedTheme });
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return (
    <main className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-zinc-50 text-zinc-900 transition-colors duration-300 select-none dark:bg-zinc-950 dark:text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.03),transparent_60%)] dark:bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.05),transparent_60%)]"
        aria-hidden
      />

      <Navbar />

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="h-[380px] w-full shrink-0 border-b border-zinc-200 lg:h-full lg:w-[28%] lg:max-w-[380px] lg:min-w-[320px] lg:border-r lg:border-b-0 dark:border-zinc-900">
          <LessonPanel />
        </div>

        <div className="flex h-auto min-w-0 flex-1 flex-col gap-4 p-4 lg:h-full">
          <div className="h-60 shrink-0 lg:h-70">
            <CommitGraph />
          </div>

          <div className="min-h-45 flex-1 lg:min-h-0">
            <FileExplorer />
          </div>

          <div className="flex h-[300px] shrink-0 flex-col gap-4 lg:h-[260px] lg:flex-row">
            <div className="h-full min-w-0 flex-1">
              <GitTerminal />
            </div>

            <div className="h-full w-full shrink-0 lg:w-[320px]">
              <ConflictResolver />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
