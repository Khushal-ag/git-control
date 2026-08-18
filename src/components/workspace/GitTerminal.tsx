"use client";

import { useEffect, useRef, useState } from "react";

import { CornerDownLeft, Sparkles } from "lucide-react";

import { useGitStore } from "@/store/git-store";

const SUGGESTIONS = [
  "git init",
  "git status",
  "git add .",
  "git add index.js",
  'git commit -m "',
  "git branch ",
  "git checkout ",
  "git switch ",
  "git merge ",
  "git rebase ",
  "git cherry-pick ",
  "git stash",
  "git stash pop",
  "git reset --hard ",
  "git reset --soft ",
  "git revert ",
  "git log",
  "git reflog",
  "clear",
  "ls",
  "cat index.js",
  "touch ",
  'echo "hello" > ',
];

export function GitTerminal() {
  const {
    terminalLogs,
    runCommand,
    terminalInputHistory,
    largeFonts,
    terminalInput,
    setTerminalInput,
  } = useGitStore();

  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selSuggestionIdx, setSelSuggestionIdx] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom of terminal
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Handle autocomplete matching
  useEffect(() => {
    const trimmed = terminalInput.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    const matches = SUGGESTIONS.filter(
      (s) => s.toLowerCase().startsWith(trimmed.toLowerCase()) && s !== trimmed,
    );
    setSuggestions(matches.slice(0, 5));
    setSelSuggestionIdx(0);
  }, [terminalInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = terminalInput.trim();
    if (!command) return;

    runCommand(command);
    setHistoryIndex(null);
    setSuggestions([]);

    // Maintain input focus
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (terminalInputHistory.length === 0) return;

      const newIdx =
        historyIndex === null ?
          terminalInputHistory.length - 1
        : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIdx);
      setTerminalInput(terminalInputHistory[newIdx] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null) return;

      const newIdx = historyIndex + 1;
      if (newIdx >= terminalInputHistory.length) {
        setHistoryIndex(null);
        setTerminalInput("");
      } else {
        setHistoryIndex(newIdx);
        setTerminalInput(terminalInputHistory[newIdx] || "");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setTerminalInput(suggestions[selSuggestionIdx] || "");
        setSuggestions([]);
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  };

  // Convert ansi escapes to styled elements (optimized for dark macOS terminal canvas)
  const parseAnsiLine = (line: string) => {
    if (!line) return <span>&nbsp;</span>;

    // Check if it is a prompt line (starts with $)
    if (line.startsWith("$ ")) {
      const commandText = line.substring(2);
      const commandParts = commandText.split(" ");
      const mainCommand = commandParts[0] || "";
      const argsText = commandParts.slice(1).join(" ");

      return (
        <span>
          <span className="font-bold text-emerald-500 dark:text-emerald-400">
            ${" "}
          </span>
          <span className="font-semibold text-sky-500 dark:text-sky-400">
            {mainCommand}
          </span>
          {argsText && (
            <span className="text-zinc-800 dark:text-[#f4f4f5]">
              {" "}
              {argsText}
            </span>
          )}
        </span>
      );
    }

    // Check if it is an error or fatal output line
    if (
      line.startsWith("fatal:") ||
      line.toLowerCase().includes("error") ||
      line.startsWith("CONFLICT")
    ) {
      return (
        <span className="font-medium text-rose-600 dark:text-rose-400">
          {line}
        </span>
      );
    }

    // Check if it is a success/info status output line
    if (
      line.startsWith("Initialized") ||
      line.startsWith("Wrote to") ||
      line.startsWith("Created file") ||
      line.startsWith("Starting lesson") ||
      line.startsWith("Good luck!") ||
      line.startsWith("Successfully") ||
      line.includes("Solved")
    ) {
      return (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {line}
        </span>
      );
    }

    // General ANSI color codes parser
    /* eslint-disable-next-line no-control-regex */
    const redRegex = /\u001b\[31m([\s\S]*?)\u001b\[m/g;
    /* eslint-disable-next-line no-control-regex */
    const greenRegex = /\u001b\[32m([\s\S]*?)\u001b\[m/g;
    /* eslint-disable-next-line no-control-regex */
    const yellowRegex = /\u001b\[33m([\s\S]*?)\u001b\[m/g;
    /* eslint-disable-next-line no-control-regex */
    const blueRegex = /\u001b\[34m([\s\S]*?)\u001b\[m/g;

    const html = line
      .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
      .replace(
        redRegex,
        '<span class="text-rose-600 dark:text-rose-400 font-semibold">$1</span>',
      )
      .replace(
        greenRegex,
        '<span class="text-emerald-600 dark:text-emerald-400 font-semibold">$1</span>',
      )
      .replace(
        yellowRegex,
        '<span class="text-amber-600 dark:text-amber-400 font-bold">$1</span>',
      )
      .replace(
        blueRegex,
        '<span class="text-sky-600 dark:text-sky-400 font-semibold">$1</span>',
      );

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white font-mono text-zinc-800 shadow-2xl transition-colors duration-300 select-none dark:border-[#2e2e33] dark:bg-[#0c0c0e] dark:text-[#d4d4d8] ${
        largeFonts ? "text-base" : "text-xs"
      }`}
    >
      {/* macOS Terminal Title Bar */}
      <div className="relative flex h-9 shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-100 px-4 transition-colors duration-300 dark:border-[#202024] dark:bg-[#1a1a1e]">
        {/* Traffic Light Dots on Left */}
        <div className="z-10 flex gap-1.5">
          <div className="size-2.5 rounded-full bg-[#FF5F56]" />
          <div className="size-2.5 rounded-full bg-[#FFBD2E]" />
          <div className="size-2.5 rounded-full bg-[#27C93F]" />
        </div>
        {/* Centered Title */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-sans text-xxs font-bold tracking-wide text-zinc-500 dark:text-zinc-400">
            zsh — gitcontrol
          </span>
        </div>
        <div className="size-3 w-12" /> {/* empty spacer */}
      </div>

      {/* Logs output area */}
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 scrollbar-thumb-zinc-200 space-y-1.5 overflow-y-auto p-4 select-text dark:scrollbar-thumb-zinc-800"
      >
        {terminalLogs.map((log, index) => (
          <div key={index} className="leading-relaxed whitespace-pre-wrap">
            {parseAnsiLine(log)}
          </div>
        ))}
      </div>

      {/* Suggestion autocomplete overlay */}
      {suggestions.length > 0 && (
        <div className="relative mx-4 mb-1">
          <div className="absolute bottom-full left-0 z-20 w-64 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-200/50 backdrop-blur-xs transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-900 dark:bg-zinc-900/95 dark:shadow-black/80">
            <div className="mb-1 flex items-center gap-1.5 border-b border-zinc-100 px-2 py-1 text-xxs font-bold text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
              <Sparkles className="size-3 animate-pulse text-orange-500 dark:text-orange-400" />
              <span>AUTOCOMPLETE SUGGESTIONS</span>
            </div>
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTerminalInput(sug);
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left font-mono text-xxs transition-colors ${
                  idx === selSuggestionIdx ?
                    "bg-orange-500/10 font-semibold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{sug}</span>
                <span className="text-xxxs text-zinc-400 dark:text-zinc-600">
                  TAB
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        className="flex h-11 shrink-0 items-center border-t border-zinc-200 bg-white px-4 transition-colors duration-300 dark:border-[#1e1e22] dark:bg-[#0c0c0e]"
      >
        <span className="mr-2.5 font-bold text-emerald-600 select-none dark:text-emerald-400">
          $
        </span>
        <input
          id="terminal-input"
          ref={inputRef}
          type="text"
          value={terminalInput}
          onChange={(e) => setTerminalInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Type git command... (e.g. git status)"
          className="flex-1 border-none bg-transparent py-2 font-mono text-zinc-900 placeholder-zinc-400 outline-none focus:ring-0 focus:outline-none dark:text-[#f4f4f5] dark:placeholder-[#52525b]"
        />
        <button
          type="submit"
          className="ml-2 flex cursor-pointer items-center justify-center rounded bg-zinc-100 p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
        >
          <CornerDownLeft className="size-3.5" />
        </button>
      </form>
    </div>
  );
}
