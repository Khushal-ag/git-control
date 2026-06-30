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

  // Hydrate theme from localStorage on mount to prevent SSR hydration mismatch
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      useGitStore.setState({ theme: savedTheme });
    }
  }, []);

  // Sync theme with documentElement class
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Register global keyboard listeners for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }

      // Redo: Ctrl/Cmd + Y
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
      {/* Background neon glows */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.03),transparent_60%)] dark:bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.05),transparent_60%)]"
        aria-hidden
      />

      {/* Top Navbar */}
      <Navbar />

      {/* Main Workspace Layout */}
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Left Column: Lesson Instructions / Sandbox Guide */}
        <div className="h-[380px] w-full shrink-0 border-b border-zinc-200 lg:h-full lg:w-[28%] lg:max-w-[380px] lg:min-w-[320px] lg:border-r lg:border-b-0 dark:border-zinc-900">
          <LessonPanel />
        </div>

        {/* Right Columns: Commit Graph, Files, Terminal + Stash */}
        <div className="flex h-auto min-w-0 flex-1 flex-col gap-4 p-4 lg:h-full">
          {/* Top: SVG Commit Graph */}
          <div className="h-[200px] shrink-0 lg:h-[220px]">
            <CommitGraph />
          </div>

          {/* Middle: Lanes File system */}
          <div className="min-h-[220px] flex-1 lg:min-h-0">
            <FileExplorer />
          </div>

          {/* Bottom: Split Terminal vs Stash Storage */}
          <div className="flex h-[300px] shrink-0 flex-col gap-4 lg:h-[260px] lg:flex-row">
            {/* Terminal */}
            <div className="h-full min-w-0 flex-1">
              <GitTerminal />
            </div>

            {/* Stash Storage & Reflog */}
            <div className="h-full w-full shrink-0 lg:w-[320px]">
              <ConflictResolver />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
