"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import {
  BookOpen,
  Check,
  ChevronDown,
  Moon,
  Play,
  Redo2,
  RotateCcw,
  Sun,
  Undo2,
} from "lucide-react";

import { lessons } from "@/lib/lessons";
import { useGitStore } from "@/store/git-store";

export function Navbar() {
  const {
    currentLessonId,
    historyStack,
    redoStack,
    theme,
    selectLesson,
    resetWorkspace,
    undo,
    redo,
    toggleTheme,
  } = useGitStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResetClick = () => {
    if (
      window.confirm(
        "Are you sure you want to reset the workspace? This will erase all commits and lesson progress.",
      )
    ) {
      resetWorkspace();
    }
  };

  return (
    <nav className="relative z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/70 px-6 backdrop-blur-md transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="flex items-center gap-3 select-none">
        <Image
          src="/icon.png"
          alt="GitControl Logo"
          width={36}
          height={36}
          className="rounded-xl object-cover shadow-md shadow-orange-500/10"
        />
        <div>
          <span className="bg-linear-to-r from-orange-500 via-rose-500 to-indigo-500 bg-clip-text text-lg font-extrabold tracking-tight text-transparent dark:from-orange-400 dark:via-rose-400 dark:to-indigo-400">
            GitControl
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {(() => {
          const activeTitle =
            currentLessonId === "sandbox" ? "Free Play Sandbox" : (
              lessons.find((l) => l.id === currentLessonId)?.title ||
              "Select Lesson"
            );
          return (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-1 text-sm font-semibold text-zinc-800 transition-all select-none hover:border-zinc-300 hover:bg-zinc-100 active:scale-98 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/80"
              >
                <BookOpen className="size-4 text-orange-500" />
                <span>{activeTitle}</span>
                <ChevronDown
                  className={`size-4 text-zinc-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 z-50 mt-2 w-64 animate-in rounded-xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xs duration-150 fade-in slide-in-from-top-1 dark:border-zinc-800 dark:bg-zinc-900/95">
                  <div className="px-2.5 py-1.5 text-[9px] font-extrabold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                    Playground Mode
                  </div>
                  <button
                    onClick={() => {
                      selectLesson("sandbox");
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      currentLessonId === "sandbox" ?
                        "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                      : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Play className="size-3.5 text-orange-500" />
                      Free Play Sandbox
                    </span>
                    {currentLessonId === "sandbox" && (
                      <Check className="size-3.5" />
                    )}
                  </button>

                  <div className="my-1.5 h-px bg-zinc-100 dark:bg-zinc-800" />

                  <div className="px-2.5 py-1.5 text-[9px] font-extrabold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                    Interactive Modules
                  </div>
                  <div className="scrollbar-thin max-h-72 space-y-0.5 overflow-y-auto pr-0.5">
                    {lessons.map((lesson) => {
                      const isActive = currentLessonId === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            selectLesson(lesson.id);
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                            isActive ?
                              "bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                            : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          <span className="truncate">{lesson.title}</span>
                          {isActive && (
                            <Check className="ml-2 size-3.5 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:disabled:hover:bg-transparent"
          >
            <Undo2 className="size-4" />
          </button>

          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
            className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:disabled:hover:bg-transparent"
          >
            <Redo2 className="size-4" />
          </button>

          <button
            onClick={handleResetClick}
            title="Reset Workspace"
            className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors hover:border-orange-500/40 hover:bg-orange-50 hover:text-orange-600 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-orange-500/40 dark:hover:bg-orange-950/20 dark:hover:text-orange-400"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          title={
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
          className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {theme === "dark" ?
            <Sun className="size-4 text-amber-500" />
          : <Moon className="size-4 text-indigo-500" />}
        </button>
      </div>
    </nav>
  );
}
