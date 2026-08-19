"use client";

import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Edit2,
  FileText,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { useGitStore } from "@/store/git-store";

export function FileExplorer() {
  const {
    gitState,
    createFile,
    editFile,
    deleteFile,
    runCommand,
    resolveConflictVisually,
  } = useGitStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newContent, setNewContent] = useState("");

  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;
    createFile(newPath.trim(), newContent);
    setNewPath("");
    setNewContent("");
    setIsCreating(false);
  };

  const startEdit = (path: string, content: string) => {
    setEditingPath(path);
    setEditingContent(content);
  };

  const handleSaveEdit = () => {
    if (editingPath) {
      editFile(editingPath, editingContent);
      setEditingPath(null);
      setEditingContent("");
    }
  };

  const activeHeadCommitId =
    gitState.currentBranch ?
      gitState.branches[gitState.currentBranch]?.commitId
    : gitState.HEAD;
  const activeCommit =
    activeHeadCommitId ? gitState.commits[activeHeadCommitId] : null;
  const committedFiles = activeCommit ? activeCommit.files : {};

  // Staged snapshot can differ from HEAD even when WD state is "modified" again.
  const workingFiles = Object.values(gitState.workingDirectory).filter(
    (file) => file.state !== "staged",
  );
  const stagedFiles = Object.keys(gitState.stagingArea)
    .filter((path) => gitState.stagingArea[path] !== committedFiles[path])
    .map((path) => ({
      path,
      content: gitState.stagingArea[path] || "",
    }));

  const getStateColor = (state: string) => {
    switch (state) {
      case "staged":
        return "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/25 dark:bg-blue-950/20 dark:text-blue-400";
      case "modified":
        return "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/25 dark:bg-amber-950/20 dark:text-amber-400";
      case "committed":
        return "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:text-emerald-400";
      default:
        return "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400";
    }
  };

  const isConflicting = (content: string) => {
    return content.includes("<<<<<<< HEAD");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white font-sans text-zinc-800 transition-colors duration-300 dark:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-300">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-900 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-orange-500" />
          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            File States Workspace
          </span>
        </div>

        {gitState.initialized && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 rounded bg-orange-500 px-2 py-1 text-xxs font-semibold text-white transition-colors hover:bg-orange-600 active:scale-95"
          >
            <Plus className="size-3" />
            <span>Create File</span>
          </button>
        )}
      </div>

      <div className="flex scrollbar-thin flex-1 scrollbar-thumb-zinc-200 divide-x divide-zinc-200 overflow-x-auto overflow-y-hidden select-none dark:scrollbar-thumb-zinc-800 dark:divide-zinc-900">
        <div className="flex w-[210px] min-w-[210px] flex-1 flex-col p-4 md:w-auto md:min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xxs font-extrabold tracking-widest text-zinc-500 uppercase">
              Working Directory
            </h4>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xxxxs font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              {workingFiles.length} files
            </span>
          </div>

          <div className="scrollbar-thin flex-1 scrollbar-thumb-zinc-200 space-y-2 overflow-y-auto pr-0.5 dark:scrollbar-thumb-zinc-800">
            <AnimatePresence mode="popLayout">
              {workingFiles.map((file) => {
                const conf = isConflicting(file.content);
                return (
                  <motion.div
                    layoutId={`file-card-${file.path}`}
                    key={`wd-${file.path}`}
                    className={`group relative rounded-xl border p-3 transition-shadow hover:shadow-md ${
                      conf ?
                        "border-rose-300 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/15"
                      : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/20 dark:hover:bg-zinc-900/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {file.path}
                        </span>
                        <span
                          className={`mt-1 inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase ${getStateColor(file.state)}`}
                        >
                          {file.state}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {!conf && (
                          <button
                            onClick={() => startEdit(file.path, file.content)}
                            title="Edit content"
                            className="p-1 text-zinc-400 transition hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
                          >
                            <Edit2 className="size-3" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteFile(file.path)}
                          title="Delete file"
                          className="p-1 text-zinc-400 transition hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400"
                        >
                          <Trash2 className="size-3" />
                        </button>
                        {!conf && (
                          <button
                            onClick={() => runCommand(`git add ${file.path}`)}
                            title="git add"
                            className="rounded bg-orange-500/10 p-1 text-orange-600 transition hover:bg-orange-500 hover:text-white"
                          >
                            <Plus className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {conf && (
                      <div className="mt-3 space-y-1.5 border-t border-rose-200 pt-2.5 dark:border-rose-900/35">
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                          <AlertCircle className="size-3" /> Merge Conflict
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() =>
                              resolveConflictVisually(file.path, "ours")
                            }
                            className="rounded bg-rose-100 py-1 text-[9px] font-bold text-rose-700 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/35"
                          >
                            Ours
                          </button>
                          <button
                            onClick={() =>
                              resolveConflictVisually(file.path, "theirs")
                            }
                            className="rounded bg-rose-100 py-1 text-[9px] font-bold text-rose-700 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/35"
                          >
                            Theirs
                          </button>
                          <button
                            onClick={() =>
                              resolveConflictVisually(file.path, "both")
                            }
                            className="rounded bg-rose-100 py-1 text-[9px] font-bold text-rose-700 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/35"
                          >
                            Both
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {workingFiles.length === 0 && (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 text-center text-xxxxs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
                <span>Working Directory empty</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-[210px] min-w-[210px] flex-1 flex-col p-4 md:w-auto md:min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xxs font-extrabold tracking-widest text-zinc-500 uppercase">
              Staging Area
            </h4>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xxxxs font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              {stagedFiles.length} files
            </span>
          </div>

          <div className="scrollbar-thin flex-1 scrollbar-thumb-zinc-200 space-y-2 overflow-y-auto pr-0.5 dark:scrollbar-thumb-zinc-800">
            <AnimatePresence mode="popLayout">
              {stagedFiles.map((file) => (
                <motion.div
                  layoutId={`staging-file-card-${file.path}`}
                  key={`staged-${file.path}`}
                  className="group relative rounded-xl border border-blue-200 bg-blue-50/20 p-3 hover:shadow dark:border-blue-900/30 dark:bg-blue-950/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {file.path}
                      </span>
                      <span className="mt-1 inline-block rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-blue-600 uppercase dark:border-blue-500/25 dark:bg-blue-950/20 dark:text-blue-400">
                        staged
                      </span>
                    </div>

                    <button
                      onClick={() => runCommand(`git reset HEAD ${file.path}`)}
                      title="Unstage (git reset)"
                      className="rounded bg-blue-100 p-1 text-blue-600 transition hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500 dark:hover:text-white"
                    >
                      <ArrowLeft className="size-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {stagedFiles.length === 0 && (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 text-center text-xxxxs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
                <span>Staging Area empty</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-[210px] min-w-[210px] flex-1 flex-col bg-zinc-50/30 p-4 md:w-auto md:min-w-0 dark:bg-zinc-950/20">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xxs font-extrabold tracking-widest text-zinc-500 uppercase">
              Local Repository
            </h4>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xxxxs font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              {Object.keys(committedFiles).length} files
            </span>
          </div>

          <div className="scrollbar-thin flex-1 scrollbar-thumb-zinc-200 space-y-2 overflow-y-auto pr-0.5 dark:scrollbar-thumb-zinc-800">
            <AnimatePresence mode="popLayout">
              {Object.keys(committedFiles).map((path) => (
                <motion.div
                  layoutId={`committed-file-card-${path}`}
                  key={`repo-${path}`}
                  className="relative rounded-xl border border-emerald-200 bg-emerald-50/20 p-3 dark:border-emerald-900/35 dark:bg-emerald-950/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {path}
                      </span>
                      <span className="mt-1 inline-block rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-emerald-600 uppercase dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:text-emerald-400">
                        committed
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {Object.keys(committedFiles).length === 0 && (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 text-center text-xxxxs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
                <span>No committed files in current HEAD</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                Create New File Visually
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xxs font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  File Name
                </label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="e.g. app.js"
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xxs font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Initial Content
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write initial code..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="dark:text-zinc-450 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="size-4 text-orange-500" />
                <h3 className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  Editing: {editingPath}
                </h3>
              </div>
              <button
                onClick={() => setEditingPath(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex font-mono text-xs select-none">
                <div className="mr-3 border-r border-zinc-200 pr-3 text-right text-zinc-400 select-none dark:border-zinc-900 dark:text-zinc-700">
                  {editingContent.split("\n").map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="min-h-[160px] flex-1 resize-y border-none bg-transparent font-mono text-xs text-zinc-800 outline-none focus:ring-0 focus:outline-none dark:text-zinc-100"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingPath(null)}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
              >
                <Save className="size-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
