import { describe, expect, it } from "vitest";

import type { GitState } from "@/types/git";

import {
  createInitialState,
  executeGitCommand,
  findMergeBase,
} from "@/lib/git-engine";

function run(state: GitState, command: string) {
  return executeGitCommand(command, state);
}

function runAll(state: GitState, commands: string[]): GitState {
  return commands.reduce((current, cmd) => run(current, cmd).nextState, state);
}

function repoWithInitialCommit(): GitState {
  return runAll(createInitialState(), [
    "git init",
    'echo "hello" > index.js',
    "git add index.js",
    'git commit -m "Initial commit"',
  ]);
}

describe("createInitialState", () => {
  it("starts uninitialized with sample untracked files", () => {
    const state = createInitialState();
    expect(state.initialized).toBe(false);
    expect(state.workingDirectory["README.md"]?.state).toBe("untracked");
    expect(state.commits).toEqual({});
  });
});

describe("git init", () => {
  it("initializes repository on main", () => {
    const { nextState, output, error } = run(createInitialState(), "git init");
    expect(error).toBeUndefined();
    expect(nextState.initialized).toBe(true);
    expect(nextState.currentBranch).toBe("main");
    expect(output[0]).toContain("Initialized empty Git repository");
  });

  it("rejects git commands before init", () => {
    const { error, output } = run(createInitialState(), "git status");
    expect(error).toBe(true);
    expect(output[0]).toContain("not a git repository");
  });
});

describe("basics workflow", () => {
  it("stages and commits a file", () => {
    const state = runAll(createInitialState(), [
      "git init",
      'echo "console.log(1)" > app.js',
      "git add app.js",
      'git commit -m "Add app"',
    ]);

    expect(Object.keys(state.commits)).toHaveLength(1);
    expect(state.branches.main?.commitId).toBeTruthy();
    expect(state.stagingArea["app.js"]).toBe("console.log(1)");
  });

  it("reports clean status when all files are committed", () => {
    const state = runAll(createInitialState(), [
      "git init",
      'echo "hello" > index.js',
      "git add .",
      'git commit -m "Initial commit"',
    ]);
    const { output } = run(state, "git status");
    expect(output.some((line) => line.includes("working tree clean"))).toBe(
      true,
    );
  });
});

describe("branching", () => {
  it("creates and checks out a branch", () => {
    const state = runAll(repoWithInitialCommit(), [
      "git branch feature",
      "git checkout feature",
    ]);

    expect(state.currentBranch).toBe("feature");
    expect(state.branches.feature?.commitId).toBe(
      state.branches.main?.commitId,
    );
  });

  it("creates branch with checkout -b", () => {
    const state = run(repoWithInitialCommit(), "git checkout -b dev").nextState;
    expect(state.currentBranch).toBe("dev");
    expect(state.branches.dev).toBeDefined();
  });
});

describe("merge", () => {
  it("fast-forwards when target is ahead", () => {
    const state = runAll(repoWithInitialCommit(), [
      "git checkout -b feature",
      'echo "feature" > index.js',
      "git add index.js",
      'git commit -m "Feature work"',
      "git checkout main",
      "git merge feature",
    ]);

    expect(state.branches.main?.commitId).toBe(
      state.branches.feature?.commitId,
    );
  });

  it("creates conflict markers on divergent edits", () => {
    const state = runAll(repoWithInitialCommit(), [
      "git checkout -b branch-a",
      'echo "A" > index.js',
      "git add index.js",
      'git commit -m "edit A"',
      "git checkout main",
      'echo "B" > index.js',
      "git add index.js",
      'git commit -m "edit B"',
      "git merge branch-a",
    ]);

    const file = state.workingDirectory["index.js"];
    expect(file?.content).toContain("<<<<<<< HEAD");
    expect(state.mergeHead).toBeTruthy();
  });
});

describe("findMergeBase", () => {
  it("finds the common ancestor of two branches", () => {
    const state = runAll(repoWithInitialCommit(), [
      "git checkout -b left",
      'echo "left" > left.js',
      "git add left.js",
      'git commit -m "left"',
      "git checkout main",
      'echo "right" > right.js',
      "git add right.js",
      'git commit -m "right"',
    ]);

    const leftTip = state.branches.left?.commitId;
    const mainTip = state.branches.main?.commitId;
    if (!leftTip || !mainTip) throw new Error("expected branch commits");

    const initialCommitId = state.commits[leftTip]?.parentIds[0];
    expect(initialCommitId).toBeTruthy();
    expect(findMergeBase(state.commits, leftTip, mainTip)).toBe(
      initialCommitId,
    );
  });
});

describe("stash", () => {
  it("saves and pops dirty changes", () => {
    let state = repoWithInitialCommit();
    state = run(state, 'echo "// wip" >> index.js').nextState;
    state = run(state, "git stash").nextState;
    expect(state.workingDirectory["index.js"]?.content).toBe("hello");
    expect(state.stagingArea["index.js"]).toBe("hello");
    expect(Object.keys(state.stagingArea).length).toBeGreaterThan(0);
    expect(
      Object.keys(state.stash[0]!.workingDirectory).length,
    ).toBeGreaterThan(0);

    const status = run(state, "git status").output.join("\n");
    expect(status).not.toContain("deleted:    index.js");

    state = run(state, "git stash pop").nextState;
    expect(state.stash).toHaveLength(0);
    expect(state.workingDirectory["index.js"]?.content).toContain("wip");
  });

  it("does not create an empty stash on a clean worktree", () => {
    const state = runAll(createInitialState(), [
      "git init",
      "git add .",
      'git commit -m "Initial commit"',
    ]);
    expect(Object.keys(state.stagingArea).length).toBeGreaterThan(0);
    expect(
      Object.values(state.workingDirectory).every(
        (f) => f.state === "committed",
      ),
    ).toBe(true);

    const { nextState, output } = run(state, "git stash");
    expect(nextState.stash).toHaveLength(0);
    expect(output.join("\n")).toContain("No local changes to save");
  });
});

describe("reset", () => {
  it("hard reset moves HEAD back one commit", () => {
    const before = runAll(repoWithInitialCommit(), [
      'echo "more" >> index.js',
      "git add index.js",
      'git commit -m "Second commit"',
    ]);
    const headBefore = before.branches.main?.commitId;

    const after = run(before, "git reset --hard HEAD~1").nextState;
    expect(after.branches.main?.commitId).not.toBe(headBefore);
    expect(after.reflog.some((e) => e.action.includes("hard"))).toBe(true);
  });

  it("pathspec reset does not mutate the prior state object", () => {
    const staged = runAll(repoWithInitialCommit(), [
      'echo "changed" > index.js',
      "git add index.js",
    ]);

    const fileRef = staged.workingDirectory["index.js"];
    expect(fileRef?.state).toBe("staged");

    const { nextState } = run(staged, "git reset HEAD index.js");

    expect(staged.workingDirectory["index.js"]).toBe(fileRef);
    expect(staged.workingDirectory["index.js"]?.state).toBe("staged");
    expect(nextState.workingDirectory["index.js"]).not.toBe(fileRef);
    expect(nextState.stagingArea["index.js"]).toBe("hello");
  });

  it("mixed reset does not mutate prior working-directory file objects", () => {
    const repo = runAll(repoWithInitialCommit(), [
      'echo "more" >> index.js',
      "git add index.js",
      'git commit -m "Second commit"',
    ]);

    const fileRef = repo.workingDirectory["index.js"];
    const { nextState } = run(repo, "git reset --mixed HEAD~1");

    expect(repo.workingDirectory["index.js"]).toBe(fileRef);
    expect(nextState.workingDirectory["index.js"]).not.toBe(fileRef);
  });
});

describe("reflog", () => {
  it("assigns sequential HEAD@{n} indices", () => {
    const state = runAll(createInitialState(), [
      "git init",
      'echo "x" > a.txt',
      "git add a.txt",
      'git commit -m "First"',
    ]);

    const { output } = run(state, "git reflog");
    expect(output[0]).toMatch(/HEAD@\{0\}/);
    expect(output[1]).toMatch(/HEAD@\{1\}/);
  });

  it("annotates reset entries with the lost commit hash", () => {
    const repo = runAll(repoWithInitialCommit(), [
      'echo "// buggy code" >> index.js',
      "git add index.js",
      'git commit -m "Introduce a bug"',
    ]);
    const bugCommit = repo.branches.main?.commitId;
    const reverted = run(repo, `git revert ${bugCommit}`).nextState;
    const reset = run(reverted, "git reset --hard HEAD~1").nextState;

    const { output } = run(reset, "git reflog");
    expect(output[0]).toMatch(/\(from [a-f0-9]{7}\)/);
  });

  it("checks out a commit via HEAD@{n}", () => {
    const repo = runAll(repoWithInitialCommit(), [
      'echo "// buggy code" >> index.js',
      "git add index.js",
      'git commit -m "Introduce a bug"',
    ]);
    const bugCommit = repo.branches.main?.commitId;
    let state = run(repo, `git revert ${bugCommit}`).nextState;
    const revertCommit = state.branches.main?.commitId;
    state = run(state, "git reset --hard HEAD~1").nextState;

    const checkedOut = run(state, "git checkout HEAD@{1}").nextState;
    expect(checkedOut.currentBranch).toBeNull();
    expect(checkedOut.HEAD).toBe(revertCommit);
  });
});

describe("revert", () => {
  it("creates an inverse commit", () => {
    const state = runAll(repoWithInitialCommit(), [
      'echo "bug" >> index.js',
      "git add index.js",
      'git commit -m "Introduce bug"',
    ]);

    const bugCommitId = state.branches.main?.commitId;
    if (!bugCommitId) throw new Error("expected bug commit");

    const reverted = run(state, `git revert ${bugCommitId}`).nextState;
    const headId = reverted.branches.main?.commitId;
    expect(reverted.commits[headId!]?.message.startsWith('Revert "')).toBe(
      true,
    );
  });
});

describe("sandbox quality", () => {
  it("git stash list does not create a stash entry", () => {
    const state = runAll(createInitialState(), [
      "git init",
      "git add .",
      'git commit -m "init"',
      'echo "wip" >> index.js',
      "git stash",
    ]);
    expect(state.stash).toHaveLength(1);

    const listed = run(state, "git stash list");
    expect(listed.nextState.stash).toHaveLength(1);
    expect(listed.output[0]).toMatch(/^stash@\{0\}:/);
  });

  it("preserves untracked files across checkout", () => {
    const state = runAll(createInitialState(), [
      "git init",
      "git add .",
      'git commit -m "init"',
      "git checkout -b feature",
      'echo "only here" > notes.txt',
      "git checkout main",
    ]);
    expect(state.workingDirectory["notes.txt"]?.content).toBe("only here");
    expect(state.workingDirectory["notes.txt"]?.state).toBe("untracked");
  });

  it("conflicted merge keeps auto-merged files from both sides", () => {
    let state = runAll(createInitialState(), [
      "git init",
      "git add .",
      'git commit -m "init"',
      "git checkout -b side",
      'echo "A" > index.js',
      'echo "from-side" > side-only.txt',
      "git add .",
      'git commit -m "side"',
      "git checkout main",
      'echo "B" > index.js',
      'echo "from-main" > main-only.txt',
      "git add .",
      'git commit -m "main"',
    ]);
    state = run(state, "git merge side").nextState;
    expect(state.mergeHead).toBeTruthy();
    expect(state.workingDirectory["index.js"]?.content).toContain("<<<<<<<");
    expect(state.workingDirectory["side-only.txt"]?.content).toBe("from-side");
    expect(state.workingDirectory["main-only.txt"]?.content).toBe("from-main");

    state = run(state, "git merge --abort").nextState;
    expect(state.mergeHead).toBeNull();
    expect(state.workingDirectory["index.js"]?.content).toBe("B");
  });

  it("supports restore --staged and diff --staged", () => {
    let state = runAll(createInitialState(), [
      "git init",
      "git add .",
      'git commit -m "init"',
      'echo "changed" > index.js',
      "git add index.js",
    ]);
    const diff = run(state, "git diff --staged").output.join("\n");
    expect(diff).toContain("index.js");

    state = run(state, "git restore --staged index.js").nextState;
    expect(state.stagingArea["index.js"]).toBe("console.log('Hello, Git!');");
  });

  it("gives a helpful message for unsupported remote commands", () => {
    const state = run(createInitialState(), "git init").nextState;
    const { output, error } = run(state, "git push");
    expect(error).toBe(true);
    expect(output.join("\n")).toContain("local-only");
  });
});

describe("shell helpers", () => {
  it("supports echo redirection and cat", () => {
    let state = createInitialState();
    state = run(state, 'echo "hello world" > notes.txt').nextState;

    const { output } = run(state, "cat notes.txt");
    expect(output).toEqual(["hello world"]);
  });

  it("chains are handled by the store, but individual commands run", () => {
    const state = run(createInitialState(), "git init").nextState;
    expect(state.initialized).toBe(true);
  });
});
