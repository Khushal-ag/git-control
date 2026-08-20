import type {
  FileState,
  GitBranch,
  GitCommit,
  GitFile,
  GitReflogEntry,
  GitState,
  StashEntry,
} from "@/types/git";

export function generateHash(): string {
  return Math.random().toString(16).substring(2, 9);
}

function resolveReflogTarget(state: GitState, ref: string): string | null {
  const match = ref.match(/^HEAD@\{(\d+)\}$/);
  if (!match) return null;
  const idx = parseInt(match[1]!, 10);
  return state.reflog[idx]?.nextHead ?? "";
}

/** Apply only the paths a commit changed vs its first parent onto a base tree. */
export function applyCommitChanges(
  ontoFiles: Record<string, string>,
  commit: GitCommit,
  commits: Record<string, GitCommit>,
): Record<string, string> {
  const parentId = commit.parentIds[0];
  const parentCommit = parentId ? commits[parentId] : undefined;
  const parentFiles = parentCommit?.files ?? {};
  const result = { ...ontoFiles };

  const paths = new Set([
    ...Object.keys(parentFiles),
    ...Object.keys(commit.files),
  ]);

  for (const path of paths) {
    const before = parentFiles[path];
    const after = commit.files[path];
    if (before === after) continue;
    if (after === undefined) {
      delete result[path];
    } else {
      result[path] = after;
    }
  }

  return result;
}

export function createInitialState(): GitState {
  const initialFiles: Record<string, GitFile> = {
    "README.md": {
      path: "README.md",
      state: "untracked",
      content:
        "# Git Sandbox\nWelcome to your interactive visual workspace. Try running some commands!",
    },
    "index.js": {
      path: "index.js",
      state: "untracked",
      content: "console.log('Hello, Git!');",
    },
  };

  return {
    initialized: false,
    commits: {},
    branches: {},
    currentBranch: null,
    HEAD: "main",
    workingDirectory: initialFiles,
    stagingArea: {},
    stash: [],
    reflog: [],
    mergeHead: null,
  };
}

// Find common ancestor between two commits
export function findMergeBase(
  commits: Record<string, GitCommit>,
  commitAId: string,
  commitBId: string,
): string | null {
  if (!commitAId || !commitBId) return null;

  const getAncestors = (commitId: string): Set<string> => {
    const ancestors = new Set<string>();
    const queue = [commitId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (ancestors.has(current)) continue;
      ancestors.add(current);
      const commit = commits[current];
      if (commit && commit.parentIds) {
        queue.push(...commit.parentIds);
      }
    }
    return ancestors;
  };

  const ancestorsA = getAncestors(commitAId);
  const queue = [commitBId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (ancestorsA.has(current)) {
      return current;
    }
    const commit = commits[current];
    if (commit && commit.parentIds) {
      queue.push(...commit.parentIds);
    }
  }

  return null;
}

export function logReflog(
  state: GitState,
  action: string,
  previousHead: string | null,
  nextHead: string,
): GitReflogEntry[] {
  const entry: GitReflogEntry = {
    id: `reflog-${generateHash()}`,
    action,
    previousHead,
    nextHead,
    timestamp: Date.now(),
  };
  return [entry, ...state.reflog];
}

export function executeGitCommand(
  commandStr: string,
  state: GitState,
): { nextState: GitState; output: string[]; error?: boolean } {
  const trimmed = commandStr.trim();
  if (!trimmed) return { nextState: state, output: [] };

  const parts = trimmed.split(/\s+/);
  const mainCmd = parts[0];

  // Support helper non-Git terminal commands
  if (mainCmd === "clear") {
    return { nextState: state, output: ["__CLEAR__"] };
  }

  if (mainCmd === "ls") {
    if (!state.initialized) {
      return {
        nextState: state,
        output: [
          "fatal: not a git repository (or any of the parent directories): .git",
        ],
      };
    }
    const files = Object.keys(state.workingDirectory);
    if (files.length === 0)
      return { nextState: state, output: ["(directory empty)"] };
    return { nextState: state, output: [files.join("    ")] };
  }

  if (mainCmd === "cat") {
    const filepath = parts[1];
    if (!filepath)
      return {
        nextState: state,
        output: ["usage: cat <filename>"],
        error: true,
      };
    const file = state.workingDirectory[filepath];
    if (!file)
      return {
        nextState: state,
        output: [`cat: ${filepath}: No such file or directory`],
        error: true,
      };
    return { nextState: state, output: file.content.split("\n") };
  }

  if (mainCmd === "touch") {
    const filepath = parts[1];
    if (!filepath)
      return {
        nextState: state,
        output: ["usage: touch <filename>"],
        error: true,
      };

    const nextWD = { ...state.workingDirectory };
    if (!nextWD[filepath]) {
      nextWD[filepath] = { path: filepath, state: "untracked", content: "" };
    }

    return {
      nextState: { ...state, workingDirectory: nextWD },
      output: [`Created empty file ${filepath}`],
    };
  }

  if (mainCmd === "rm") {
    const filepath = parts[1];
    if (!filepath)
      return {
        nextState: state,
        output: ["usage: rm <filename>"],
        error: true,
      };

    const nextWD = { ...state.workingDirectory };
    if (!nextWD[filepath]) {
      return {
        nextState: state,
        output: [`rm: ${filepath}: No such file or directory`],
        error: true,
      };
    }

    delete nextWD[filepath];
    return {
      nextState: { ...state, workingDirectory: nextWD },
      output: [`Removed file ${filepath}`],
    };
  }

  if (mainCmd === "echo") {
    const isAppend = parts.includes(">>");
    const isOverwrite = parts.includes(">");

    if (isAppend || isOverwrite) {
      const redirectSymbol = isAppend ? ">>" : ">";
      const redirectIdx = parts.indexOf(redirectSymbol);
      if (redirectIdx !== -1 && redirectIdx < parts.length - 1) {
        const filepath = parts[parts.length - 1]!;

        let text = "";
        const quoteRegex = new RegExp(
          `echo\\s+["'](.*?)["']\\s*${redirectSymbol}`,
        );
        const fallbackRegex = new RegExp(`echo\\s+(.*?)\\s*${redirectSymbol}`);

        const quoteMatch =
          commandStr.match(quoteRegex) || commandStr.match(fallbackRegex);
        if (quoteMatch) {
          text = quoteMatch[1] || "";
        }

        const nextWD = { ...state.workingDirectory };
        const existing = nextWD[filepath];

        let fileState: FileState = "untracked";
        let newContent = text;

        if (existing) {
          fileState =
            (
              existing.state === "committed" ||
              existing.state === "staged" ||
              existing.state === "modified"
            ) ?
              "modified"
            : "untracked";

          if (isAppend) {
            newContent =
              existing.content ? existing.content + "\n" + text : text;
          }
        }

        nextWD[filepath] = {
          path: filepath,
          state: fileState,
          content: newContent,
        };

        return {
          nextState: { ...state, workingDirectory: nextWD },
          output: [
            isAppend ? `Appended to ${filepath}` : `Wrote to ${filepath}`,
          ],
        };
      }
    }

    const textMatch =
      commandStr.match(/echo\s+["'](.*?)["']/) ||
      commandStr.match(/echo\s+(.*)/);
    const printedText = (textMatch ? textMatch[1] : "") || "";
    return { nextState: state, output: [printedText] };
  }

  // Git specific parser
  if (mainCmd !== "git") {
    return {
      nextState: state,
      output: [`bash: ${mainCmd}: command not found`],
      error: true,
    };
  }

  const gitSub = parts[1];
  if (!gitSub) {
    return {
      nextState: state,
      output: [
        "usage: git [--version] [--help] <command> [<args>]",
        "",
        "Supported commands in this simulator:",
        "  init, status, add, commit, branch, checkout, switch, merge,",
        "  rebase, cherry-pick, stash, reset, revert, reflog, log",
      ],
    };
  }

  if (gitSub === "-v" || gitSub === "--version" || gitSub === "version") {
    return {
      nextState: state,
      output: ["git version 2.45.2 (gitcontrol-simulator)"],
    };
  }

  if (gitSub === "-h" || gitSub === "--help" || gitSub === "help") {
    return {
      nextState: state,
      output: [
        "usage: git [--version] [--help] <command> [<args>]",
        "",
        "Supported commands in this simulator:",
        "  init, status, add, commit, branch, checkout, switch, merge,",
        "  rebase, cherry-pick, stash, reset, revert, reflog, log",
      ],
    };
  }

  const SUPPORTED_SUBCOMMANDS = [
    "init",
    "status",
    "add",
    "commit",
    "branch",
    "checkout",
    "switch",
    "merge",
    "rebase",
    "cherry-pick",
    "stash",
    "reset",
    "revert",
    "reflog",
    "log",
  ];

  if (!SUPPORTED_SUBCOMMANDS.includes(gitSub)) {
    return {
      nextState: state,
      output: [`git: '${gitSub}' is not a git command. See 'git --help'.`],
      error: true,
    };
  }

  if (gitSub === "init") {
    if (state.initialized) {
      return {
        nextState: state,
        output: ["Reinitialized existing Git repository"],
      };
    }
    const nextState: GitState = {
      ...state,
      initialized: true,
      currentBranch: "main",
      HEAD: "main",
      branches: {
        main: { name: "main", commitId: "" },
      },
    };
    nextState.reflog = logReflog(
      nextState,
      "init: initialized repo",
      null,
      "main",
    );
    return {
      nextState,
      output: ["Initialized empty Git repository in /workspace/.git/"],
    };
  }

  if (!state.initialized) {
    return {
      nextState: state,
      output: [
        "fatal: not a git repository (or any of the parent directories): .git",
      ],
      error: true,
    };
  }

  // git status
  if (gitSub === "status") {
    const output: string[] = [];
    if (state.currentBranch) {
      output.push(`On branch ${state.currentBranch}`);
    } else {
      output.push(`HEAD detached at ${state.HEAD.substring(0, 7)}`);
    }

    const untracked: string[] = [];
    const modified: string[] = [];
    const staged: string[] = [];

    const headCommitId =
      (state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD) || "";
    const headCommit = headCommitId ? state.commits[headCommitId] : null;
    const headFiles = headCommit ? headCommit.files : {};

    Object.keys(state.workingDirectory).forEach((path) => {
      const file = state.workingDirectory[path]!;
      const inStaging = state.stagingArea[path] !== undefined;
      const inHead = headFiles[path] !== undefined;

      if (!inStaging && !inHead) {
        untracked.push(path);
      } else if (inStaging && state.stagingArea[path] !== file.content) {
        modified.push(path);
      }
    });

    Object.keys(state.stagingArea).forEach((path) => {
      if (!state.workingDirectory[path]) {
        modified.push(`deleted: ${path}`);
      }
    });

    Object.keys(state.stagingArea).forEach((path) => {
      if (headFiles[path] === undefined) {
        staged.push(`new file:   ${path}`);
      } else if (headFiles[path] !== state.stagingArea[path]) {
        staged.push(`modified:   ${path}`);
      }
    });

    Object.keys(headFiles).forEach((path) => {
      if (state.stagingArea[path] === undefined) {
        staged.push(`deleted:    ${path}`);
      }
    });

    if (staged.length > 0) {
      output.push("Changes to be committed:");
      output.push('  (use "git restore --staged <file>..." to unstage)');
      staged.forEach((f) => output.push(`\t${f}`));
      output.push("");
    }

    if (modified.length > 0) {
      output.push("Changes not staged for commit:");
      output.push(
        '  (use "git add <file>..." to update what will be committed)',
      );
      modified.forEach((f) => output.push(`\t${f}`));
      output.push("");
    }

    if (untracked.length > 0) {
      output.push("Untracked files:");
      output.push(
        '  (use "git add <file>..." to include in what will be committed)',
      );
      untracked.forEach((f) => output.push(`\t${f}`));
      output.push("");
    }

    if (
      staged.length === 0 &&
      modified.length === 0 &&
      untracked.length === 0
    ) {
      output.push("nothing to commit, working tree clean");
    }

    return { nextState: state, output };
  }

  // git add
  if (gitSub === "add") {
    const fileTarget = parts[2];
    if (!fileTarget) {
      return {
        nextState: state,
        output: ["Nothing specified, nothing added."],
        error: true,
      };
    }

    const nextWD = { ...state.workingDirectory };
    const nextStaging = { ...state.stagingArea };

    if (fileTarget === "." || fileTarget === "-A") {
      Object.keys(nextWD).forEach((path) => {
        const file = nextWD[path];
        if (file) {
          nextStaging[path] = file.content;
          nextWD[path] = { ...file, state: "staged" };
        }
      });

      const currentHeadId =
        (state.currentBranch ?
          state.branches[state.currentBranch]?.commitId
        : state.HEAD) || "";
      const headCommit = currentHeadId ? state.commits[currentHeadId] : null;
      const headFiles = headCommit ? headCommit.files : {};

      Object.keys({ ...headFiles, ...nextStaging }).forEach((path) => {
        if (!nextWD[path]) {
          delete nextStaging[path];
        }
      });

      return {
        nextState: {
          ...state,
          workingDirectory: nextWD,
          stagingArea: nextStaging,
        },
        output: ["Staged all changes"],
      };
    } else {
      const file = nextWD[fileTarget];
      if (!file) {
        const currentHeadId =
          (state.currentBranch ?
            state.branches[state.currentBranch]?.commitId
          : state.HEAD) || "";
        const headCommit = currentHeadId ? state.commits[currentHeadId] : null;
        const headFiles = headCommit ? headCommit.files : {};

        if (
          headFiles[fileTarget] !== undefined ||
          nextStaging[fileTarget] !== undefined
        ) {
          delete nextStaging[fileTarget];
          return {
            nextState: { ...state, stagingArea: nextStaging },
            output: [`Staged deletion of ${fileTarget}`],
          };
        }

        return {
          nextState: state,
          output: [`fatal: pathspec '${fileTarget}' did not match any files`],
          error: true,
        };
      }

      nextStaging[fileTarget] = file.content;
      nextWD[fileTarget] = { ...file, state: "staged" };
      return {
        nextState: {
          ...state,
          workingDirectory: nextWD,
          stagingArea: nextStaging,
        },
        output: [`Staged ${fileTarget}`],
      };
    }
  }

  // git commit
  if (gitSub === "commit") {
    const mFlagIdx = parts.indexOf("-m");
    let msg = "";
    if (mFlagIdx !== -1 && mFlagIdx < parts.length - 1) {
      const rawMsg = parts.slice(mFlagIdx + 1).join(" ");
      msg = rawMsg.replace(/^["']|["']$/g, "");
    }

    if (!msg) {
      return {
        nextState: state,
        output: [
          "error: switch `m' requires a value",
          "fatal: empty commit message is not allowed",
        ],
        error: true,
      };
    }

    const currentHeadCommitId =
      (state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD) || "";
    const currentHeadCommit =
      currentHeadCommitId ? state.commits[currentHeadCommitId] : null;
    const parentFiles = currentHeadCommit ? currentHeadCommit.files : {};

    const hasStagedChanges =
      Object.keys(state.stagingArea).length !==
        Object.keys(parentFiles).length ||
      Object.keys(state.stagingArea).some(
        (p) => state.stagingArea[p] !== parentFiles[p],
      );

    if (!hasStagedChanges) {
      return {
        nextState: state,
        output: [
          "On branch " + (state.currentBranch || "detached"),
          "nothing to commit, working tree clean",
        ],
        error: true,
      };
    }

    const committedFiles: Record<string, string> = { ...state.stagingArea };

    const newCommitId = generateHash();
    const parentIds = currentHeadCommitId ? [currentHeadCommitId] : [];
    if (state.mergeHead) {
      parentIds.push(state.mergeHead);
    }
    const newCommit: GitCommit = {
      id: newCommitId,
      parentIds,
      message: msg,
      author: "learner@git-control.dev",
      timestamp: Date.now(),
      files: committedFiles,
    };

    const nextCommits = { ...state.commits, [newCommitId]: newCommit };
    const nextBranches = { ...state.branches };
    let nextHEAD = state.HEAD;

    if (state.currentBranch) {
      const activeB = nextBranches[state.currentBranch];
      if (activeB) activeB.commitId = newCommitId;
      nextHEAD = state.currentBranch;
    } else {
      nextHEAD = newCommitId;
    }

    const nextWD = { ...state.workingDirectory };
    Object.keys(nextWD).forEach((path) => {
      const file = nextWD[path];
      if (file && file.state === "staged") {
        nextWD[path] = { ...file, state: "committed" };
      }
    });

    const previousHeadLog = currentHeadCommitId;
    const nextState: GitState = {
      ...state,
      commits: nextCommits,
      branches: nextBranches,
      HEAD: nextHEAD,
      stagingArea: { ...committedFiles },
      workingDirectory: nextWD,
      mergeHead: null,
    };

    nextState.reflog = logReflog(
      nextState,
      `commit: ${msg}`,
      previousHeadLog || null,
      newCommitId,
    );

    const changedFilesCount =
      Object.keys(committedFiles).filter(
        (p) => committedFiles[p] !== parentFiles[p],
      ).length +
      Object.keys(parentFiles).filter((p) => committedFiles[p] === undefined)
        .length;

    return {
      nextState,
      output: [
        `[${state.currentBranch || "detached-HEAD"} ${newCommitId}] ${msg}`,
        ` ${changedFilesCount} file(s) changed`,
      ],
    };
  }

  // git branch
  if (gitSub === "branch") {
    const branchName = parts[2];
    const dFlagIdx = parts.indexOf("-d");

    if (!branchName) {
      const output = Object.keys(state.branches).map((b) => {
        const isActive = b === state.currentBranch;
        return `${isActive ? "* " : "  "}${b}`;
      });
      return { nextState: state, output };
    }

    if (dFlagIdx !== -1) {
      const delName = parts[dFlagIdx + 1] || branchName;
      if (delName === state.currentBranch) {
        return {
          nextState: state,
          output: [
            `error: Cannot delete branch '${delName}' checked out at '${state.HEAD}'`,
          ],
          error: true,
        };
      }
      if (!state.branches[delName]) {
        return {
          nextState: state,
          output: [`error: branch '${delName}' not found.`],
          error: true,
        };
      }

      const nextBranches = { ...state.branches };
      delete nextBranches[delName];
      return {
        nextState: { ...state, branches: nextBranches },
        output: [`Deleted branch ${delName}`],
      };
    }

    if (state.branches[branchName]) {
      return {
        nextState: state,
        output: [`fatal: A branch named '${branchName}' already exists.`],
        error: true,
      };
    }

    const currentCommitId =
      (state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD) || "";

    const nextBranches: Record<string, GitBranch> = {
      ...state.branches,
      [branchName]: {
        name: branchName,
        commitId: currentCommitId,
      },
    };

    return {
      nextState: { ...state, branches: nextBranches },
      output: [
        `Created branch ${branchName} pointing to ${currentCommitId ? currentCommitId.substring(0, 7) : "empty"}`,
      ],
    };
  }

  // git checkout or git switch
  if (gitSub === "checkout" || gitSub === "switch") {
    // Real git uses `-b` for checkout and `-c` for switch to mean the same
    // thing (create-and-switch); accept either on both so the two commands
    // stay fully interchangeable, matching how the lessons teach `switch`
    // as a drop-in alternative to `checkout`.
    const bFlagIdx =
      parts.indexOf("-b") !== -1 ? parts.indexOf("-b") : parts.indexOf("-c");
    let target = parts[2];

    if (target) {
      const reflogTarget = resolveReflogTarget(state, target);
      if (reflogTarget !== null) {
        if (!reflogTarget) {
          return {
            nextState: state,
            output: [
              `fatal: ambiguous argument '${parts[2]}': unknown revision or path not in the working tree.`,
            ],
            error: true,
          };
        }
        target = reflogTarget;
      }
    }

    if (bFlagIdx !== -1 && bFlagIdx < parts.length - 1) {
      const newBranchName = parts[bFlagIdx + 1] || "";
      if (!newBranchName) {
        return {
          nextState: state,
          output: ["error: branch name required"],
          error: true,
        };
      }
      if (state.branches[newBranchName]) {
        return {
          nextState: state,
          output: [`fatal: A branch named '${newBranchName}' already exists.`],
          error: true,
        };
      }

      const currentCommitId =
        (state.currentBranch ?
          state.branches[state.currentBranch]?.commitId
        : state.HEAD) || "";
      const nextBranches: Record<string, GitBranch> = {
        ...state.branches,
        [newBranchName]: {
          name: newBranchName,
          commitId: currentCommitId,
        },
      };

      const nextState: GitState = {
        ...state,
        branches: nextBranches,
        currentBranch: newBranchName,
        HEAD: newBranchName,
        stagingArea:
          currentCommitId ? { ...state.commits[currentCommitId]?.files } : {},
        mergeHead: null,
      };

      nextState.reflog = logReflog(
        nextState,
        `checkout: moving from ${state.currentBranch || state.HEAD} to ${newBranchName}`,
        currentCommitId || null,
        newBranchName,
      );

      return {
        nextState,
        output: [`Switched to a new branch '${newBranchName}'`],
      };
    }

    if (!target) {
      return {
        nextState: state,
        output: ["error: checkout target required"],
        error: true,
      };
    }

    let isBranch = false;
    let targetCommitId = "";

    const checkoutBranch = state.branches[target];
    if (checkoutBranch) {
      isBranch = true;
      targetCommitId = checkoutBranch.commitId;
    } else if (state.commits[target]) {
      targetCommitId = target;
    } else {
      return {
        nextState: state,
        output: [`error: pathspec '${target}' did not match any branch/commit`],
        error: true,
      };
    }

    const targetCommit = targetCommitId ? state.commits[targetCommitId] : null;

    const isForce = parts.includes("-f") || parts.includes("--force");
    if (!isForce) {
      const targetCommitFiles = targetCommit ? targetCommit.files : {};

      const dirtyFiles: string[] = [];
      Object.keys(state.workingDirectory).forEach((path) => {
        const file = state.workingDirectory[path]!;
        const hasUncommittedChanges =
          file.state === "modified" || file.state === "staged";

        if (hasUncommittedChanges) {
          const targetContent = targetCommitFiles[path];
          if (file.content !== targetContent) {
            dirtyFiles.push(path);
          }
        }
      });

      if (dirtyFiles.length > 0) {
        return {
          nextState: state,
          output: [
            `error: Your local changes to the following files would be overwritten by checkout:`,
            ...dirtyFiles.map((f) => `  ${f}`),
            `Please commit your changes or stash them before you switch branches.`,
            `Aborting...`,
          ],
          error: true,
        };
      }
    }

    const nextWD = { ...state.workingDirectory };

    if (targetCommit) {
      Object.keys(targetCommit.files).forEach((path) => {
        nextWD[path] = {
          path,
          state: "committed",
          content: targetCommit.files[path]!,
        };
      });
      Object.keys(nextWD).forEach((path) => {
        if (targetCommit.files[path] === undefined) {
          delete nextWD[path];
        }
      });
    } else {
      Object.keys(nextWD).forEach((path) => {
        delete nextWD[path];
      });
    }

    const previousHeadLog =
      state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD;
    const nextState: GitState = {
      ...state,
      currentBranch: isBranch ? target : null,
      HEAD: isBranch ? target : targetCommitId,
      workingDirectory: nextWD,
      stagingArea: targetCommit ? { ...targetCommit.files } : {},
      mergeHead: null,
    };

    nextState.reflog = logReflog(
      nextState,
      `checkout: moving from ${state.currentBranch || state.HEAD} to ${target}`,
      previousHeadLog || null,
      targetCommitId || target,
    );

    return {
      nextState,
      output: [
        isBranch ?
          `Switched to branch '${target}'`
        : `Note: switching to '${target}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them...`,
      ],
    };
  }

  // git merge
  if (gitSub === "merge") {
    const targetBranch = parts[2];
    if (!targetBranch) {
      return {
        nextState: state,
        output: ["fatal: merge requires a branch name"],
        error: true,
      };
    }

    const targetBranchObj = state.branches[targetBranch];
    if (!targetBranchObj) {
      return {
        nextState: state,
        output: [`merge: ${targetBranch} - not something we can merge`],
        error: true,
      };
    }

    if (targetBranch === state.currentBranch) {
      return { nextState: state, output: ["Already up to date."], error: true };
    }

    const currentHeadCommitId =
      state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD;
    const targetCommitId = targetBranchObj.commitId;

    if (!targetCommitId) {
      return {
        nextState: state,
        output: [`fatal: Branch ${targetBranch} has no commits yet.`],
        error: true,
      };
    }
    if (!currentHeadCommitId) {
      const nextBranches = { ...state.branches };
      if (state.currentBranch) {
        const activeB = nextBranches[state.currentBranch];
        if (activeB) activeB.commitId = targetCommitId;
      }

      const nextWD = { ...state.workingDirectory };
      const targetCommit = state.commits[targetCommitId];
      if (targetCommit) {
        Object.keys(targetCommit.files).forEach((p) => {
          nextWD[p] = {
            path: p,
            state: "committed",
            content: targetCommit.files[p]!,
          };
        });
        Object.keys(nextWD).forEach((p) => {
          if (targetCommit.files[p] === undefined) delete nextWD[p];
        });
      }

      const nextState = {
        ...state,
        branches: nextBranches,
        workingDirectory: nextWD,
        stagingArea:
          targetCommit ? { ...targetCommit.files } : state.stagingArea,
        HEAD: state.currentBranch || targetCommitId,
      };

      return {
        nextState,
        output: ["Fast-forward merge success."],
      };
    }

    const baseCommitId = findMergeBase(
      state.commits,
      currentHeadCommitId,
      targetCommitId,
    );

    if (baseCommitId === targetCommitId) {
      return { nextState: state, output: ["Already up to date."] };
    }

    if (baseCommitId === currentHeadCommitId) {
      const nextBranches = { ...state.branches };
      if (state.currentBranch) {
        const activeB = nextBranches[state.currentBranch];
        if (activeB) activeB.commitId = targetCommitId;
      }

      const nextWD = { ...state.workingDirectory };
      const targetCommit = state.commits[targetCommitId];
      if (targetCommit) {
        Object.keys(targetCommit.files).forEach((p) => {
          nextWD[p] = {
            path: p,
            state: "committed",
            content: targetCommit.files[p]!,
          };
        });
        Object.keys(nextWD).forEach((p) => {
          if (targetCommit.files[p] === undefined) delete nextWD[p];
        });
      }

      const nextState: GitState = {
        ...state,
        branches: nextBranches,
        workingDirectory: nextWD,
        stagingArea:
          targetCommit ? { ...targetCommit.files } : state.stagingArea,
        HEAD: state.currentBranch || targetCommitId,
      };

      nextState.reflog = logReflog(
        nextState,
        `merge ${targetBranch}: Fast-forward`,
        currentHeadCommitId,
        targetCommitId,
      );

      return {
        nextState,
        output: [
          "Updating " +
            currentHeadCommitId.substring(0, 7) +
            ".." +
            targetCommitId.substring(0, 7),
          "Fast-forward",
        ],
      };
    }

    const baseFiles =
      baseCommitId ? state.commits[baseCommitId]?.files || {} : {};
    const ourFiles = state.commits[currentHeadCommitId]?.files || {};
    const theirFiles = state.commits[targetCommitId]?.files || {};

    const mergedFiles: Record<string, string> = {};
    const conflicts: string[] = [];
    const allFilePaths = Array.from(
      new Set([
        ...Object.keys(baseFiles),
        ...Object.keys(ourFiles),
        ...Object.keys(theirFiles),
      ]),
    );

    allFilePaths.forEach((path) => {
      const baseVal = baseFiles[path];
      const ourVal = ourFiles[path];
      const theirVal = theirFiles[path];

      if (baseVal === ourVal && baseVal === theirVal) {
        if (baseVal !== undefined) mergedFiles[path] = baseVal;
      } else if (baseVal !== ourVal && baseVal === theirVal) {
        if (ourVal !== undefined) mergedFiles[path] = ourVal;
      } else if (baseVal === ourVal && baseVal !== theirVal) {
        if (theirVal !== undefined) mergedFiles[path] = theirVal;
      } else {
        if (ourVal === theirVal) {
          if (ourVal !== undefined) mergedFiles[path] = ourVal;
        } else {
          conflicts.push(path);
          const conflictContent = `<<<<<<< HEAD\n${ourVal || ""}\n=======\n${theirVal || ""}\n>>>>>>> ${targetBranch}`;
          mergedFiles[path] = conflictContent;
        }
      }
    });

    if (conflicts.length > 0) {
      const nextWD = { ...state.workingDirectory };
      conflicts.forEach((path) => {
        nextWD[path] = {
          path,
          state: "modified",
          content: mergedFiles[path] || "",
        };
      });

      return {
        nextState: {
          ...state,
          workingDirectory: nextWD,
          mergeHead: targetCommitId,
        },
        output: [
          "Auto-merging files...",
          ...conflicts.map((f) => `CONFLICT (content): Merge conflict in ${f}`),
          "Automatic merge failed; fix conflicts and then commit the result.",
        ],
        error: true,
      };
    }

    const newCommitId = generateHash();
    const mergeMessage = `Merge branch '${targetBranch}' into '${state.currentBranch || "HEAD"}'`;
    const mergeCommit: GitCommit = {
      id: newCommitId,
      parentIds: [currentHeadCommitId, targetCommitId],
      message: mergeMessage,
      author: "learner@git-control.dev",
      timestamp: Date.now(),
      files: mergedFiles,
    };

    const nextCommits = { ...state.commits, [newCommitId]: mergeCommit };
    const nextBranches = { ...state.branches };
    if (state.currentBranch) {
      const activeB = nextBranches[state.currentBranch];
      if (activeB) activeB.commitId = newCommitId;
    }

    const nextWD = { ...state.workingDirectory };
    Object.keys(mergedFiles).forEach((p) => {
      nextWD[p] = { path: p, state: "committed", content: mergedFiles[p]! };
    });
    Object.keys(nextWD).forEach((p) => {
      if (mergedFiles[p] === undefined) delete nextWD[p];
    });

    const nextState: GitState = {
      ...state,
      commits: nextCommits,
      branches: nextBranches,
      workingDirectory: nextWD,
      stagingArea: { ...mergedFiles },
      HEAD: state.currentBranch || newCommitId,
    };

    nextState.reflog = logReflog(
      nextState,
      `merge ${targetBranch}: Merge commit created`,
      currentHeadCommitId,
      newCommitId,
    );

    return {
      nextState,
      output: [
        "Auto-merging files...",
        `Merge made by the 'recursive' strategy.`,
        `[${state.currentBranch || "HEAD"} ${newCommitId}] ${mergeMessage}`,
      ],
    };
  }

  // git rebase
  if (gitSub === "rebase") {
    const targetBranch = parts[2];
    if (!targetBranch) {
      return {
        nextState: state,
        output: ["fatal: rebase requires a branch name"],
        error: true,
      };
    }
    const rebaseTargetBranch = state.branches[targetBranch];
    if (!rebaseTargetBranch) {
      return {
        nextState: state,
        output: [`fatal: Branch '${targetBranch}' does not exist`],
        error: true,
      };
    }

    const currentHeadCommitId =
      state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD;
    const targetCommitId = rebaseTargetBranch.commitId;

    if (!currentHeadCommitId || !targetCommitId) {
      return {
        nextState: state,
        output: ["fatal: empty histories"],
        error: true,
      };
    }

    const baseCommitId = findMergeBase(
      state.commits,
      currentHeadCommitId,
      targetCommitId,
    );

    if (baseCommitId === targetCommitId) {
      return { nextState: state, output: ["Already up to date."] };
    }

    const commitsToReplay: GitCommit[] = [];
    let currentId = currentHeadCommitId;

    while (currentId && currentId !== baseCommitId) {
      const comm = state.commits[currentId];
      if (comm) {
        commitsToReplay.push(comm);
        currentId = comm.parentIds[0] || "";
      } else {
        break;
      }
    }

    commitsToReplay.reverse();

    if (commitsToReplay.length === 0) {
      const nextBranches = { ...state.branches };
      if (state.currentBranch) {
        const activeB = nextBranches[state.currentBranch];
        if (activeB) activeB.commitId = targetCommitId;
      }

      const ffTargetCommit = state.commits[targetCommitId];
      const nextWD = { ...state.workingDirectory };
      if (ffTargetCommit) {
        Object.keys(ffTargetCommit.files).forEach((p) => {
          nextWD[p] = {
            path: p,
            state: "committed",
            content: ffTargetCommit.files[p]!,
          };
        });
        Object.keys(nextWD).forEach((p) => {
          if (ffTargetCommit.files[p] === undefined) delete nextWD[p];
        });
      }

      return {
        nextState: {
          ...state,
          branches: nextBranches,
          workingDirectory: nextWD,
          stagingArea:
            ffTargetCommit ? { ...ffTargetCommit.files } : state.stagingArea,
          HEAD: state.currentBranch || targetCommitId,
        },
        output: [
          `Successfully rebased and updated ${state.currentBranch || "HEAD"}.`,
        ],
      };
    }

    let lastParentId = targetCommitId;
    const nextCommits = { ...state.commits };

    for (const commitToReplay of commitsToReplay) {
      const newHash = generateHash();
      const lastParentCommit = nextCommits[lastParentId];
      const lastParentFiles = lastParentCommit ? lastParentCommit.files : {};

      const replayedCommitFiles = applyCommitChanges(
        lastParentFiles,
        commitToReplay,
        nextCommits,
      );

      const replayedCommit: GitCommit = {
        id: newHash,
        parentIds: [lastParentId],
        message: `${commitToReplay.message} (rebased)`,
        author: commitToReplay.author,
        timestamp: Date.now(),
        files: replayedCommitFiles,
      };

      nextCommits[newHash] = replayedCommit;
      lastParentId = newHash;
    }

    const nextBranches = { ...state.branches };
    if (state.currentBranch) {
      const activeB = nextBranches[state.currentBranch];
      if (activeB) activeB.commitId = lastParentId;
    }

    const finalCommit = nextCommits[lastParentId];
    const nextWD = { ...state.workingDirectory };
    if (finalCommit) {
      Object.keys(finalCommit.files).forEach((p) => {
        nextWD[p] = {
          path: p,
          state: "committed",
          content: finalCommit.files[p]!,
        };
      });
      Object.keys(nextWD).forEach((p) => {
        if (finalCommit.files[p] === undefined) delete nextWD[p];
      });
    }

    const nextState: GitState = {
      ...state,
      commits: nextCommits,
      branches: nextBranches,
      workingDirectory: nextWD,
      stagingArea: finalCommit ? { ...finalCommit.files } : state.stagingArea,
      HEAD: state.currentBranch || lastParentId,
    };

    nextState.reflog = logReflog(
      nextState,
      `rebase onto ${targetBranch}: Replayed ${commitsToReplay.length} commit(s)`,
      currentHeadCommitId,
      lastParentId,
    );

    return {
      nextState,
      output: [
        `First, rewinding head to replay your work on top of it...`,
        ...commitsToReplay.map((c) => `Applying: ${c.message}`),
        `Successfully rebased and updated ${state.currentBranch || "HEAD"}.`,
      ],
    };
  }

  // git cherry-pick
  if (gitSub === "cherry-pick") {
    const targetHash = parts[2];
    if (!targetHash) {
      return {
        nextState: state,
        output: ["fatal: cherry-pick requires a commit hash"],
        error: true,
      };
    }

    const targetCommit = state.commits[targetHash];
    if (!targetCommit) {
      return {
        nextState: state,
        output: [`fatal: commit ${targetHash} not found`],
        error: true,
      };
    }

    const currentHeadCommitId =
      (state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD) || "";
    if (!currentHeadCommitId) {
      return {
        nextState: state,
        output: ["fatal: cherry-pick on an empty branch"],
        error: true,
      };
    }

    const newHash = generateHash();
    const currentCommit = state.commits[currentHeadCommitId];
    const currentFiles = currentCommit ? currentCommit.files : {};

    const mergedFiles = applyCommitChanges(
      currentFiles,
      targetCommit,
      state.commits,
    );

    const pickCommit: GitCommit = {
      id: newHash,
      parentIds: [currentHeadCommitId],
      message: `${targetCommit.message} (cherry-picked)`,
      author: targetCommit.author,
      timestamp: Date.now(),
      files: mergedFiles,
    };

    const nextCommits = { ...state.commits, [newHash]: pickCommit };
    const nextBranches = { ...state.branches };
    if (state.currentBranch) {
      const activeB = nextBranches[state.currentBranch];
      if (activeB) activeB.commitId = newHash;
    }

    const nextWD = { ...state.workingDirectory };
    Object.keys(mergedFiles).forEach((p) => {
      nextWD[p] = { path: p, state: "committed", content: mergedFiles[p]! };
    });
    Object.keys(nextWD).forEach((p) => {
      if (mergedFiles[p] === undefined) delete nextWD[p];
    });

    const nextState: GitState = {
      ...state,
      commits: nextCommits,
      branches: nextBranches,
      workingDirectory: nextWD,
      stagingArea: { ...mergedFiles },
      HEAD: state.currentBranch || newHash,
    };

    nextState.reflog = logReflog(
      nextState,
      `cherry-pick: ${targetHash}`,
      currentHeadCommitId,
      newHash,
    );

    const changedCount =
      Object.keys(mergedFiles).filter((p) => mergedFiles[p] !== currentFiles[p])
        .length +
      Object.keys(currentFiles).filter((p) => mergedFiles[p] === undefined)
        .length;

    return {
      nextState,
      output: [
        `[${state.currentBranch || "detached"} ${newHash}] ${targetCommit.message} (cherry-picked)`,
        ` ${changedCount} file(s) changed`,
      ],
    };
  }

  // git stash
  if (gitSub === "stash") {
    const stashCmd = parts[2];

    if (stashCmd === "pop" || stashCmd === "apply") {
      if (state.stash.length === 0 || !state.stash[0]) {
        return {
          nextState: state,
          output: ["No stash entries found."],
          error: true,
        };
      }

      const popped = state.stash[0];
      // `apply` restores the changes but keeps the entry on the stash stack;
      // only `pop` removes it — the one real difference between the two.
      const nextStash = stashCmd === "pop" ? state.stash.slice(1) : state.stash;

      const nextWD = { ...state.workingDirectory };
      const nextStaging = { ...state.stagingArea, ...popped.stagingArea };

      Object.keys(popped.workingDirectory).forEach((path) => {
        const file = popped.workingDirectory[path];
        if (file) {
          nextWD[path] = file;
        }
      });

      return {
        nextState: {
          ...state,
          workingDirectory: nextWD,
          stagingArea: nextStaging,
          stash: nextStash,
        },
        output: [
          `On branch ${state.currentBranch || "detached"}`,
          ...(stashCmd === "pop" ? ["Dropped refs/stash@{0}"] : []),
          `Restored stashed changes.`,
        ],
      };
    }

    const currentHeadCommitId =
      (state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD) || "";
    const currentCommit =
      currentHeadCommitId ? state.commits[currentHeadCommitId] : null;
    const currentFiles = currentCommit ? currentCommit.files : {};

    const stashWD: Record<string, GitFile> = {};
    const nextWD = { ...state.workingDirectory };

    Object.keys(state.workingDirectory).forEach((path) => {
      const file = state.workingDirectory[path];
      if (
        file &&
        (file.state === "modified" ||
          file.state === "untracked" ||
          file.state === "staged")
      ) {
        stashWD[path] = { ...file };
        const headContent = currentFiles[path];
        if (headContent !== undefined) {
          nextWD[path] = {
            path,
            state: "committed",
            content: headContent,
          };
        } else {
          delete nextWD[path];
        }
      }
    });

    if (
      Object.keys(stashWD).length === 0 &&
      Object.keys(state.stagingArea).length === 0
    ) {
      return { nextState: state, output: ["No local changes to save."] };
    }

    const message =
      parts.slice(2).join(" ") || "WIP on " + (state.currentBranch || "HEAD");
    const newStashEntry: StashEntry = {
      id: `stash-${generateHash()}`,
      workingDirectory: stashWD,
      stagingArea: { ...state.stagingArea },
      message,
      timestamp: Date.now(),
    };

    const nextState = {
      ...state,
      workingDirectory: nextWD,
      stagingArea: { ...currentFiles },
      stash: [newStashEntry, ...state.stash],
    };

    return {
      nextState,
      output: [
        `Saved working directory and index state WIP on ${state.currentBranch || "HEAD"}: ${message}`,
      ],
    };
  }

  // git reset
  if (gitSub === "reset") {
    const currentHeadCommitId =
      (state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD) || "";

    const lastArg = parts[parts.length - 1] || "";
    const isPathspec =
      state.workingDirectory[lastArg] !== undefined ||
      state.stagingArea[lastArg] !== undefined ||
      (currentHeadCommitId &&
        state.commits[currentHeadCommitId]?.files[lastArg] !== undefined);

    if (isPathspec) {
      const filePath = lastArg;
      let commitExpr = "HEAD";
      if (parts.length === 4) {
        commitExpr = parts[2] || "HEAD";
      }

      let targetCommitId = "";
      if (commitExpr === "HEAD") {
        targetCommitId = currentHeadCommitId;
      } else if (state.branches[commitExpr]) {
        targetCommitId = state.branches[commitExpr]?.commitId || "";
      } else if (state.commits[commitExpr]) {
        targetCommitId = commitExpr;
      }

      const targetCommit =
        targetCommitId ? state.commits[targetCommitId] : null;
      const targetFiles = targetCommit ? targetCommit.files : {};

      const nextStaging = { ...state.stagingArea };
      const nextWD = { ...state.workingDirectory };

      const targetContent = targetFiles[filePath];

      if (targetContent === undefined) {
        delete nextStaging[filePath];
        const file = nextWD[filePath];
        if (file) {
          nextWD[filePath] = { ...file, state: "untracked" };
        }
      } else {
        nextStaging[filePath] = targetContent;
        const file = nextWD[filePath];
        if (file) {
          nextWD[filePath] = {
            ...file,
            state: file.content === targetContent ? "committed" : "modified",
          };
        }
      }

      const nextState: GitState = {
        ...state,
        workingDirectory: nextWD,
        stagingArea: nextStaging,
      };

      return {
        nextState,
        output: [`Unstaged ${filePath}`],
      };
    }

    let mode: "soft" | "mixed" | "hard" = "mixed";
    let targetExpr = "";

    const arg2 = parts[2];
    const arg3 = parts[3];

    if (arg2 === "--soft") {
      mode = "soft";
      targetExpr = arg3 || "HEAD";
    } else if (arg2 === "--mixed") {
      mode = "mixed";
      targetExpr = arg3 || "HEAD";
    } else if (arg2 === "--hard") {
      mode = "hard";
      targetExpr = arg3 || "HEAD";
    } else {
      targetExpr = arg2 || "HEAD";
    }

    let targetCommitId = "";
    if (targetExpr === "HEAD") {
      targetCommitId = currentHeadCommitId;
    } else if (targetExpr === "HEAD~1" || targetExpr === "HEAD~") {
      const currentCommit = state.commits[currentHeadCommitId];
      targetCommitId = currentCommit?.parentIds[0] || "";
    } else if (targetExpr.startsWith("HEAD~")) {
      const offset = parseInt(targetExpr.substring(5), 10);
      let curr = currentHeadCommitId;
      for (let i = 0; i < offset; i++) {
        if (!curr) break;
        const c = state.commits[curr];
        curr = c?.parentIds[0] || "";
      }
      targetCommitId = curr;
    } else if (state.branches[targetExpr]) {
      targetCommitId = state.branches[targetExpr]?.commitId || "";
    } else if (state.commits[targetExpr]) {
      targetCommitId = targetExpr;
    }

    if (!targetCommitId) {
      if (targetExpr === "HEAD" && !currentHeadCommitId) {
        const nextWD = { ...state.workingDirectory };
        Object.keys(nextWD).forEach((p) => {
          const f = nextWD[p];
          if (f) nextWD[p] = { ...f, state: "untracked" };
        });
        const nextState: GitState = {
          ...state,
          stagingArea: {},
          workingDirectory: nextWD,
        };
        return {
          nextState,
          output: ["Unstaged all changes"],
        };
      }

      return {
        nextState: state,
        output: [`fatal: ambiguous argument '${targetExpr}': unknown revision`],
        error: true,
      };
    }

    const nextBranches = { ...state.branches };
    let nextHEAD = state.HEAD;

    if (state.currentBranch) {
      const activeB = nextBranches[state.currentBranch];
      if (activeB) activeB.commitId = targetCommitId;
    } else {
      nextHEAD = targetCommitId;
    }

    const nextState: GitState = {
      ...state,
      branches: nextBranches,
      HEAD: nextHEAD,
      mergeHead: null,
    };

    const targetCommit = state.commits[targetCommitId];
    const targetFiles = targetCommit ? targetCommit.files : {};

    if (mode === "hard") {
      const nextWD: Record<string, GitFile> = {};
      Object.keys(targetFiles).forEach((p) => {
        nextWD[p] = { path: p, state: "committed", content: targetFiles[p]! };
      });
      nextState.workingDirectory = nextWD;
      nextState.stagingArea = { ...targetFiles };
    } else if (mode === "mixed") {
      nextState.stagingArea = { ...targetFiles };
      const nextWD = { ...state.workingDirectory };

      Object.keys(nextWD).forEach((path) => {
        const file = nextWD[path];
        if (file) {
          nextWD[path] = {
            ...file,
            state:
              targetFiles[path] === undefined ? "untracked"
              : targetFiles[path] !== file.content ? "modified"
              : "committed",
          };
        }
      });

      nextState.workingDirectory = nextWD;
    }

    nextState.reflog = logReflog(
      nextState,
      `reset: moving to ${targetExpr} (${mode})`,
      currentHeadCommitId,
      targetCommitId,
    );

    return {
      nextState,
      output: [
        `HEAD is now at ${targetCommitId.substring(0, 7)} ${targetCommit?.message || ""}`,
      ],
    };
  }

  // git revert
  if (gitSub === "revert") {
    const targetHash = parts[2];
    if (!targetHash) {
      return {
        nextState: state,
        output: ["fatal: revert requires a commit hash"],
        error: true,
      };
    }

    const targetCommit = state.commits[targetHash];
    if (!targetCommit) {
      return {
        nextState: state,
        output: [`fatal: commit ${targetHash} not found`],
        error: true,
      };
    }

    const currentHeadCommitId =
      (state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD) || "";
    if (!currentHeadCommitId) {
      return {
        nextState: state,
        output: ["fatal: revert on an empty branch"],
        error: true,
      };
    }

    const parentId = targetCommit.parentIds[0];
    const parentCommit = parentId ? state.commits[parentId] : null;
    const parentFiles = parentCommit ? parentCommit.files : {};

    const headCommit = state.commits[currentHeadCommitId];
    const headFiles = headCommit ? headCommit.files : {};

    const revertedFiles = { ...headFiles };

    Object.keys(targetCommit.files).forEach((path) => {
      const parentVal = parentFiles[path];

      if (parentVal === undefined) {
        delete revertedFiles[path];
      } else {
        revertedFiles[path] = parentVal;
      }
    });

    Object.keys(parentFiles).forEach((path) => {
      if (targetCommit.files[path] === undefined) {
        revertedFiles[path] = parentFiles[path] || "";
      }
    });

    const newHash = generateHash();
    const revertMsg = `Revert "${targetCommit.message}"`;
    const revertCommit: GitCommit = {
      id: newHash,
      parentIds: [currentHeadCommitId],
      message: revertMsg,
      author: "learner@git-control.dev",
      timestamp: Date.now(),
      files: revertedFiles,
    };

    const nextCommits = { ...state.commits, [newHash]: revertCommit };
    const nextBranches = { ...state.branches };
    if (state.currentBranch) {
      const activeB = nextBranches[state.currentBranch];
      if (activeB) activeB.commitId = newHash;
    }

    const nextWD = { ...state.workingDirectory };
    Object.keys(revertedFiles).forEach((p) => {
      nextWD[p] = { path: p, state: "committed", content: revertedFiles[p]! };
    });
    Object.keys(nextWD).forEach((p) => {
      if (revertedFiles[p] === undefined) delete nextWD[p];
    });

    const nextState: GitState = {
      ...state,
      commits: nextCommits,
      branches: nextBranches,
      workingDirectory: nextWD,
      stagingArea: { ...revertedFiles },
      HEAD: state.currentBranch || newHash,
    };

    nextState.reflog = logReflog(
      nextState,
      `revert: ${targetHash}`,
      currentHeadCommitId,
      newHash,
    );

    return {
      nextState,
      output: [
        `[${state.currentBranch || "detached"} ${newHash}] ${revertMsg}`,
        ` 1 file changed`,
      ],
    };
  }

  // git reflog
  if (gitSub === "reflog") {
    const output = state.reflog.map((entry, index) => {
      const hash = entry.nextHead.substring(0, 7);
      let line = `${hash} HEAD@{${index}}: ${entry.action}`;
      if (entry.action.includes("reset: ") && entry.previousHead) {
        line += ` (from ${entry.previousHead.substring(0, 7)})`;
      }
      return line;
    });
    return { nextState: state, output };
  }

  // git log
  if (gitSub === "log") {
    const currentHeadCommitId =
      (state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD) || "";
    if (!currentHeadCommitId) {
      return {
        nextState: state,
        output: ["fatal: your current branch does not have any commits yet"],
        error: true,
      };
    }

    const output: string[] = [];
    let currentId = currentHeadCommitId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const commit = state.commits[currentId];
      if (!commit) break;

      const pointingBranches: string[] = [];
      Object.keys(state.branches).forEach((b) => {
        const branchObj = state.branches[b];
        if (branchObj && branchObj.commitId === currentId) {
          pointingBranches.push(b);
        }
      });

      let refNames = "";
      const currentBranchObj =
        state.currentBranch ? state.branches[state.currentBranch] : null;
      if (
        pointingBranches.length > 0 ||
        state.HEAD === currentId ||
        (currentBranchObj && currentBranchObj.commitId === currentId)
      ) {
        const parts: string[] = [];
        if (
          state.currentBranch &&
          state.branches[state.currentBranch]?.commitId === currentId
        ) {
          parts.push(`HEAD -> ${state.currentBranch}`);
        } else if (state.HEAD === currentId) {
          parts.push("HEAD");
        }
        pointingBranches.forEach((b) => {
          if (b !== state.currentBranch) parts.push(b);
        });
        refNames = ` (\u001b[33m${parts.join(", ")}\u001b[m)`;
      }

      output.push(`\u001b[33mcommit ${currentId}${refNames}\u001b[m`);
      if (commit.parentIds.length > 1) {
        output.push(
          `Merge: ${commit.parentIds.map((p) => p.substring(0, 7)).join(" ")}`,
        );
      }
      output.push(`Author: ${commit.author}`);
      output.push(`Date:   ${new Date(commit.timestamp).toUTCString()}`);
      output.push("");
      output.push(`    ${commit.message}`);
      output.push("");

      currentId = commit.parentIds[0] || "";
    }

    return { nextState: state, output };
  }

  return {
    nextState: state,
    output: [`git: '${gitSub}' is not a git command. See 'git --help'.`],
    error: true,
  };
}
