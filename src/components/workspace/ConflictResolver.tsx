"use client";

import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";

import { useGitStore } from "@/store/git-store";

export function ConflictResolver() {
  const { gitState, resolveConflictVisually } = useGitStore();

  const conflictingFiles = Object.values(gitState.workingDirectory).filter(
    (f) => f.content.includes("<<<<<<< HEAD"),
  );

  if (conflictingFiles.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 font-sans transition-colors duration-300 dark:border-zinc-900 dark:bg-zinc-950">
        <h4 className="mb-4 flex items-center gap-1.5 text-xxs font-extrabold tracking-widest text-zinc-500 uppercase">
          <FileText className="size-3.5 text-zinc-400" />
          <span>Stash Storage & Reflog</span>
        </h4>

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

  const activeFile = conflictingFiles[0]!;
  const regex = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> (.*)/;
  const match = activeFile.content.match(regex);

  const ours = match ? match[1] : "";
  const theirs = match ? match[2] : "";
  const targetBranchName = match ? match[3] : "incoming branch";

  return (
    <div className="flex h-full flex-col rounded-xl border border-rose-200 bg-white p-5 font-sans shadow-md shadow-rose-950/5 transition-colors duration-300 dark:border-rose-900/30 dark:bg-zinc-950">
      <div className="mb-4 flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-900">
        <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-500">
          <AlertTriangle className="size-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold tracking-wider text-rose-600 uppercase dark:text-rose-400">
            Conflicts Detected
          </h4>
          <p className="mt-0.5 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
            File: {activeFile.path}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-4">
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          A conflict occurred because lines in{" "}
          <code className="rounded border border-rose-100 bg-rose-50 px-1 py-0.5 text-rose-700 dark:border-none dark:bg-rose-950/20 dark:text-rose-400">
            {activeFile.path}
          </code>{" "}
          were changed on both branches. Review differences below and resolve.
        </p>

        <div className="grid min-h-[140px] flex-1 grid-cols-2 gap-3">
          <div className="flex flex-col overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/20 dark:border-emerald-950 dark:bg-emerald-950/5">
            <div className="border-b border-emerald-200 bg-emerald-100 px-3 py-1.5 font-mono text-xxs font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
              Current (HEAD / Ours)
            </div>
            <div className="flex-1 overflow-auto bg-zinc-50 p-3 font-mono text-[10px] leading-relaxed whitespace-pre text-emerald-800 dark:bg-zinc-950/60 dark:text-emerald-300">
              {ours || <span className="text-zinc-400 italic">(empty)</span>}
            </div>
            <button
              onClick={() => resolveConflictVisually(activeFile.path, "ours")}
              className="m-2 rounded bg-emerald-500 px-2 py-1.5 text-xxs font-bold text-white transition hover:bg-emerald-600"
            >
              Accept Ours
            </button>
          </div>

          <div className="flex flex-col overflow-hidden rounded-lg border border-purple-200 bg-purple-50/20 dark:border-purple-950 dark:bg-purple-950/5">
            <div className="border-b border-purple-200 bg-purple-100 px-3 py-1.5 font-mono text-xxs font-bold wrap-break-word text-purple-700 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-400">
              Incoming ({targetBranchName})
            </div>
            <div className="flex-1 overflow-auto bg-zinc-50 p-3 font-mono text-[10px] leading-relaxed whitespace-pre text-purple-800 dark:bg-zinc-950/60 dark:text-purple-300">
              {theirs || <span className="text-zinc-400 italic">(empty)</span>}
            </div>
            <button
              onClick={() => resolveConflictVisually(activeFile.path, "theirs")}
              className="m-2 rounded bg-purple-500 px-2 py-1.5 text-xxs font-bold text-white transition hover:bg-purple-600"
            >
              Accept Theirs
            </button>
          </div>
        </div>

        <button
          onClick={() => resolveConflictVisually(activeFile.path, "both")}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <CheckCircle2 className="size-4 text-orange-500" />
          <span>Keep Both Changes</span>
        </button>

        <div className="flex items-center justify-center gap-1 text-center text-[10px] leading-relaxed text-zinc-500">
          <span>After resolving, run</span>
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            git add
          </code>
          <span>and</span>
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            git commit
          </code>
        </div>
      </div>
    </div>
  );
}
