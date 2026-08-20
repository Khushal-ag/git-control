"use client";

import { useEffect } from "react";

import { AlertTriangle, CheckCircle2, FileText, X } from "lucide-react";

import { useGitStore } from "@/store/git-store";

function StashAndReflogPanel() {
  const { gitState, conflictDialogOpen, openConflictDialog } = useGitStore();
  const hasConflicts = Object.values(gitState.workingDirectory).some((f) =>
    f.content.includes("<<<<<<<"),
  );
  const showReviewBanner = hasConflicts && !conflictDialogOpen;

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 font-sans transition-colors duration-300 dark:border-zinc-900 dark:bg-zinc-950">
      <h4 className="mb-4 flex items-center gap-1.5 text-xxs font-extrabold tracking-widest text-zinc-500 uppercase">
        <FileText className="size-3.5 text-zinc-400" />
        <span>Stash Storage & Reflog</span>
      </h4>

      {showReviewBanner && (
        <button
          type="button"
          onClick={openConflictDialog}
          className="mb-3 flex w-full items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-left transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:hover:bg-rose-950/50"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-rose-700 dark:text-rose-300">
              Merge conflict waiting
            </span>
            <span className="mt-0.5 block text-[10px] font-medium text-rose-600/80 dark:text-rose-400/80">
              Open the resolver to compare both versions
            </span>
          </span>
        </button>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto pr-0.5">
        <div>
          <h5 className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            <span>Stash Stack (refs/stash)</span>
            <span className="rounded bg-zinc-100 px-1.5 font-mono text-[9px] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-600">
              {gitState.stash.length} items
            </span>
          </h5>

          {gitState.stash.length > 0 ?
            <div className="space-y-2">
              {gitState.stash.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
                >
                  <div className="flex items-center justify-between text-xxs font-bold text-zinc-600 dark:text-zinc-300">
                    <span className="font-mono text-orange-600 dark:text-orange-400">
                      stash@&#123;{idx}&#125;
                    </span>
                    <span className="font-mono text-zinc-400 dark:text-zinc-500">
                      {entry.id.substring(6, 12)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-zinc-700 dark:text-zinc-400">
                    {entry.message}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[9px] text-zinc-400 dark:text-zinc-500">
                    <span>
                      Files: {Object.keys(entry.workingDirectory).join(", ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          : <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xxxxs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
              Stash stack is empty. Run 'git stash' to save temporary changes.
            </div>
          }
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-900" />

        <div>
          <h5 className="mb-2 text-[10px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            HEAD Reflog (Recent Movements)
          </h5>
          {gitState.reflog.length > 0 ?
            <div className="max-h-[160px] space-y-1.5 overflow-y-auto pr-1">
              {gitState.reflog.slice(0, 6).map((entry, idx) => {
                const isReset = entry.action.includes("reset: ");
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-0.5 font-mono text-xxxxs leading-relaxed"
                  >
                    <div className="flex items-start gap-1.5">
                      <span className="text-amber-600 dark:text-amber-500">
                        {entry.nextHead.substring(0, 7)}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500">
                        HEAD@&#123;{idx}&#125;:
                      </span>
                      <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400">
                        {entry.action}
                      </span>
                    </div>
                    {isReset && entry.previousHead && (
                      <p className="pl-1 text-[9px] text-rose-500 dark:text-rose-400">
                        Lost commit: {entry.previousHead.substring(0, 7)}.
                        Recover with{" "}
                        <span className="font-bold">
                          git checkout HEAD@{idx + 1}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          : <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xxxxs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
              No reflog entries yet.
            </div>
          }
        </div>
      </div>
    </div>
  );
}

function ConflictOverlay() {
  const { gitState, resolveConflictVisually, closeConflictDialog } =
    useGitStore();

  const conflictingFiles = Object.values(gitState.workingDirectory).filter(
    (f) => f.content.includes("<<<<<<<"),
  );
  const activeFile = conflictingFiles[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConflictDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeConflictDialog]);

  if (!activeFile) return null;

  const match = activeFile.content.match(
    /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> ([^\r\n]*)/,
  );
  const ours = match?.[1] ?? "";
  const theirs = match?.[2] ?? "";
  const targetBranchName = match?.[3]?.trim() || "incoming";

  const resolve = (choice: "ours" | "theirs" | "both") => {
    resolveConflictVisually(activeFile.path, choice);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[2px]"
      onClick={closeConflictDialog}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        className="flex max-h-[min(560px,90dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl dark:border-rose-900/40 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="conflict-dialog-title"
              className="text-sm font-bold tracking-wide text-rose-600 uppercase dark:text-rose-400"
            >
              Merge Conflict
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              <code className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {activeFile.path}
              </code>{" "}
              was edited on both branches. Choose which version to keep.
            </p>
          </div>
          <button
            type="button"
            onClick={closeConflictDialog}
            aria-label="Close conflict dialog"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-4 sm:grid-cols-2">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-900/50">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/40">
              <span className="truncate font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Current (Ours)
              </span>
              <button
                type="button"
                onClick={() => resolve("ours")}
                className="shrink-0 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-600"
              >
                Accept Ours
              </button>
            </div>
            <pre className="min-h-[140px] flex-1 overflow-auto bg-zinc-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-emerald-900 dark:bg-zinc-900/60 dark:text-emerald-200">
              {ours || "(empty)"}
            </pre>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-purple-200 dark:border-purple-900/50">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-purple-200 bg-purple-50 px-3 py-2 dark:border-purple-900/40 dark:bg-purple-950/40">
              <span
                className="truncate font-mono text-xs font-bold text-purple-700 dark:text-purple-400"
                title={`Incoming (${targetBranchName})`}
              >
                Incoming ({targetBranchName})
              </span>
              <button
                type="button"
                onClick={() => resolve("theirs")}
                className="shrink-0 rounded-md bg-purple-500 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-purple-600"
              >
                Accept Theirs
              </button>
            </div>
            <pre className="min-h-[140px] flex-1 overflow-auto bg-zinc-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-purple-900 dark:bg-zinc-900/60 dark:text-purple-200">
              {theirs || "(empty)"}
            </pre>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <p className="text-[11px] text-zinc-500">
            After resolving, run{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono dark:bg-zinc-900">
              git add
            </code>{" "}
            then{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono dark:bg-zinc-900">
              git commit
            </code>
          </p>
          <button
            type="button"
            onClick={() => resolve("both")}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <CheckCircle2 className="size-4 text-orange-500" />
            Keep Both Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConflictResolver() {
  const { gitState, conflictDialogOpen } = useGitStore();
  const hasConflicts = Object.values(gitState.workingDirectory).some((f) =>
    f.content.includes("<<<<<<<"),
  );

  return (
    <>
      <StashAndReflogPanel />
      {hasConflicts && conflictDialogOpen && <ConflictOverlay />}
    </>
  );
}
