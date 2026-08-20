import { describe, expect, it } from "vitest";

import type { GitState } from "@/types/git";

import { createInitialState, executeGitCommand } from "@/lib/git-engine";
import { lessons } from "@/lib/lessons";

function run(state: GitState, command: string, allowError = false) {
  const result = executeGitCommand(command, state);
  if (!allowError) {
    expect(
      result.error,
      `Command failed: ${command}\n${result.output.join("\n")}`,
    ).toBeFalsy();
  }
  return result.nextState;
}

function runAll(
  state: GitState,
  commands: string[],
  allowError = false,
): GitState {
  return commands.reduce((s, cmd) => run(s, cmd, allowError), state);
}

function seedLesson(lessonId: string): GitState {
  const initialRepo = createInitialState();

  if (lessonId === "basics") {
    initialRepo.workingDirectory = {};
    return initialRepo;
  }

  if (
    lessonId === "branching" ||
    lessonId === "merging" ||
    lessonId === "rebase" ||
    lessonId === "recovery" ||
    lessonId === "stash"
  ) {
    const seedCommitId = "seed001";
    initialRepo.initialized = true;
    initialRepo.currentBranch = "main";
    initialRepo.HEAD = "main";
    initialRepo.branches = {
      main: { name: "main", commitId: seedCommitId },
    };
    initialRepo.commits = {
      [seedCommitId]: {
        id: seedCommitId,
        parentIds: [],
        message: "Initial commit",
        author: "learner@git-control.dev",
        timestamp: Date.now() - 60000,
        files: {
          "README.md":
            "# Git Sandbox\nWelcome to your interactive visual workspace. Try running some commands!",
          "index.js": "console.log('Hello, Git!');",
        },
      },
    };
    if (initialRepo.workingDirectory["README.md"]) {
      initialRepo.workingDirectory["README.md"].state = "committed";
    }
    if (initialRepo.workingDirectory["index.js"]) {
      initialRepo.workingDirectory["index.js"].state = "committed";
    }
    initialRepo.stagingArea = {
      ...initialRepo.commits[seedCommitId]!.files,
    };
  }

  return initialRepo;
}

function getInitialCommitId(state: GitState): string {
  const mainId = state.branches.main?.commitId;
  if (!mainId) throw new Error("main branch has no commit");
  let curr = mainId;
  while (true) {
    const commit = state.commits[curr];
    if (!commit || commit.parentIds.length === 0) return curr;
    curr = commit.parentIds[0]!;
  }
}

function findOrphanCommit(state: GitState): string | null {
  const branchTips = new Set(
    Object.values(state.branches)
      .map((b) => b.commitId)
      .filter(Boolean),
  );
  return (
    Object.keys(state.commits).find(
      (id) =>
        !branchTips.has(id) &&
        state.commits[id]?.message.includes("feature commit") &&
        !state.commits[id]?.message.includes("(rebased)"),
    ) ?? null
  );
}

function resolvePostPresetCommands(
  lessonId: string,
  stepTitle: string,
  state: GitState,
): string[] {
  if (lessonId === "recovery" && stepTitle === "Reverting a Commit") {
    const headId = state.branches.main?.commitId ?? state.HEAD;
    return [`git revert ${headId}`];
  }

  return [];
}

function resolvePresetCommands(
  lessonId: string,
  stepTitle: string,
  state: GitState,
  preset: string | string[] | undefined,
): string[] {
  if (preset) {
    return Array.isArray(preset) ? preset : [preset];
  }

  if (lessonId === "branching" && stepTitle === "Detached HEAD Mode") {
    return [`git checkout ${getInitialCommitId(state)}`];
  }

  if (lessonId === "rebase" && stepTitle === "Cherry-Picking a Commit") {
    const orphan = findOrphanCommit(state);
    if (!orphan)
      throw new Error("no orphaned feature commit found for cherry-pick");
    return [`git cherry-pick ${orphan}`];
  }

  return [];
}

interface StepResult {
  lessonId: string;
  stepTitle: string;
  passed: boolean;
  reason?: string;
  skipped?: boolean;
}

function verifyLessonFlow(lessonId: string): StepResult[] {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Error(`unknown lesson: ${lessonId}`);

  let state = seedLesson(lessonId);
  const results: StepResult[] = [];

  for (const step of lesson.steps) {
    if (step.quiz) {
      results.push({
        lessonId,
        stepTitle: step.title,
        passed: true,
        skipped: true,
        reason: "quiz, validated via answerQuiz in UI",
      });
      continue;
    }

    if (!step.objective) {
      results.push({
        lessonId,
        stepTitle: step.title,
        passed: true,
        skipped: true,
        reason: "intro step, no objective",
      });
      continue;
    }

    try {
      const presetCommands = resolvePresetCommands(
        lessonId,
        step.title,
        state,
        step.commandPreset,
      );

      if (presetCommands.length === 0 && !step.commandPreset) {
        const standalone = resolvePresetCommands(
          lessonId,
          step.title,
          state,
          undefined,
        );
        if (standalone.length === 0) {
          results.push({
            lessonId,
            stepTitle: step.title,
            passed: false,
            reason: "no commands to run",
          });
          continue;
        }
        state = runAll(state, standalone);
      } else {
        if (presetCommands.length > 0) {
          state = runAll(
            state,
            presetCommands,
            step.title === "Triggering a Merge Conflict",
          );
        }
        const postCommands = resolvePostPresetCommands(
          lessonId,
          step.title,
          state,
        );
        if (postCommands.length > 0) {
          state = runAll(state, postCommands);
        }
      }

      const passed = step.objective.validate(state);
      results.push({
        lessonId,
        stepTitle: step.title,
        passed,
        reason: passed ? undefined : "objective.validate returned false",
      });
    } catch (err) {
      results.push({
        lessonId,
        stepTitle: step.title,
        passed: false,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

describe("lesson flows", () => {
  for (const lesson of lessons) {
    it(`lesson "${lesson.id}" all objective steps pass when following commands`, () => {
      const results = verifyLessonFlow(lesson.id);
      const failures = results.filter((r) => !r.passed);

      if (failures.length > 0) {
        const report = failures
          .map((f) => `  • ${f.stepTitle}: ${f.reason}`)
          .join("\n");
        expect.fail(`Lesson "${lesson.id}" failed steps:\n${report}`);
      }

      expect(results.some((r) => r.passed || r.skipped)).toBe(true);
    });
  }
});

describe("objectives stay pending until the key action finishes", () => {
  function objective(lessonId: string, title: string) {
    const step = lessons
      .find((l) => l.id === lessonId)!
      .steps.find((s) => s.title === title)!;
    return step.objective!;
  }

  it("basics: file/stage/commit each need their own command", () => {
    let state = seedLesson("basics");
    expect(
      objective("basics", "Initializing a Repository").validate(state),
    ).toBe(false);
    state = run(state, "git init");
    expect(
      objective("basics", "Initializing a Repository").validate(state),
    ).toBe(true);

    expect(objective("basics", "Creating a File").validate(state)).toBe(false);
    state = run(state, `echo "console.log('Hello, Git!');" > index.js`);
    expect(objective("basics", "Creating a File").validate(state)).toBe(true);

    expect(objective("basics", "Staging Your Changes").validate(state)).toBe(
      false,
    );
    state = run(state, "git add index.js");
    expect(objective("basics", "Staging Your Changes").validate(state)).toBe(
      true,
    );

    expect(
      objective("basics", "Creating Your First Commit").validate(state),
    ).toBe(false);
    state = run(state, 'git commit -m "Initial commit"');
    expect(
      objective("basics", "Creating Your First Commit").validate(state),
    ).toBe(true);
  });

  it("branching: commit objective needs the commit, not just the edit", () => {
    let state = seedLesson("branching");
    state = runAll(state, [
      "git branch feature/login",
      "git checkout feature/login",
      'echo "// login page logic" >> index.js',
      "git add index.js",
    ]);
    expect(
      objective("branching", "Committing on a Branch").validate(state),
    ).toBe(false);
    state = run(state, 'git commit -m "Add login framework"');
    expect(
      objective("branching", "Committing on a Branch").validate(state),
    ).toBe(true);
  });

  it("merging: checkout-main and fast-forward do not pass early", () => {
    let state = seedLesson("merging");
    expect(objective("merging", "Switching back to Main").validate(state)).toBe(
      false,
    );

    state = runAll(state, [
      "git checkout -b feature/login",
      'echo "// login page logic" >> index.js',
      "git add index.js",
      'git commit -m "Add login framework"',
    ]);
    expect(objective("merging", "Switching back to Main").validate(state)).toBe(
      false,
    );
    state = run(state, "git checkout main");
    expect(objective("merging", "Switching back to Main").validate(state)).toBe(
      true,
    );

    expect(objective("merging", "Fast-forward Merge").validate(state)).toBe(
      false,
    );
    state = run(state, "git merge feature/login");
    expect(objective("merging", "Fast-forward Merge").validate(state)).toBe(
      true,
    );
  });

  it("merging: conflict/resolve steps need merge then commit", () => {
    let state = seedLesson("merging");
    state = runAll(state, [
      "git checkout -b feature/login",
      'echo "// login page logic" >> index.js',
      "git add index.js",
      'git commit -m "Add login framework"',
      "git checkout main",
      "git merge feature/login",
      "git checkout -b branch-a",
      'echo "A" > index.js',
      "git add index.js",
      'git commit -m "edit A"',
      "git checkout main",
      'echo "B" > index.js',
      "git add index.js",
      'git commit -m "edit B"',
    ]);
    expect(
      objective("merging", "Triggering a Merge Conflict").validate(state),
    ).toBe(false);
    state = run(state, "git merge branch-a", true);
    expect(
      objective("merging", "Triggering a Merge Conflict").validate(state),
    ).toBe(true);

    expect(objective("merging", "Resolving Conflicts").validate(state)).toBe(
      false,
    );
    state = runAll(state, [
      'echo "Resolved Content" > index.js',
      "git add index.js",
    ]);
    expect(objective("merging", "Resolving Conflicts").validate(state)).toBe(
      false,
    );
    state = run(state, 'git commit -m "Resolve merge conflict"');
    expect(objective("merging", "Resolving Conflicts").validate(state)).toBe(
      true,
    );
  });

  it("recovery: revert/reset/reflog each need their command", () => {
    let state = seedLesson("recovery");
    state = runAll(state, [
      'echo "// buggy code" >> index.js',
      "git add index.js",
      'git commit -m "Introduce a bug"',
    ]);
    expect(objective("recovery", "Reverting a Commit").validate(state)).toBe(
      false,
    );
    state = run(state, `git revert ${state.branches.main!.commitId}`);
    expect(objective("recovery", "Reverting a Commit").validate(state)).toBe(
      true,
    );

    expect(objective("recovery", "Resetting History").validate(state)).toBe(
      false,
    );
    state = run(state, "git reset --hard HEAD~1");
    expect(objective("recovery", "Resetting History").validate(state)).toBe(
      true,
    );

    expect(objective("recovery", "The Magic of Reflog").validate(state)).toBe(
      false,
    );
    state = run(state, "git checkout HEAD@{1}");
    expect(objective("recovery", "The Magic of Reflog").validate(state)).toBe(
      true,
    );
  });

  it("stash: pop does not pass with an empty stash before restoring", () => {
    let state = seedLesson("stash");
    expect(objective("stash", "Popping Changes").validate(state)).toBe(false);

    state = run(state, 'echo "// work in progress" >> index.js');
    expect(objective("stash", "Stashing Changes").validate(state)).toBe(false);
    state = run(state, "git stash");
    expect(objective("stash", "Stashing Changes").validate(state)).toBe(true);

    expect(objective("stash", "Popping Changes").validate(state)).toBe(false);
    state = run(state, "git stash pop");
    expect(objective("stash", "Popping Changes").validate(state)).toBe(true);
  });

  it("every multi-command preset stays unsolved until the final command", () => {
    for (const lesson of lessons) {
      let state = seedLesson(lesson.id);

      for (const step of lesson.steps) {
        if (!step.objective) continue;

        const commands =
          lesson.id === "branching" && step.title === "Detached HEAD Mode" ?
            [`git checkout ${getInitialCommitId(state)}`]
          : lesson.id === "rebase" && step.title === "Cherry-Picking a Commit" ?
            (() => {
              const orphan = findOrphanCommit(state);
              if (!orphan) throw new Error("missing orphan for cherry-pick");
              return [`git cherry-pick ${orphan}`];
            })()
          : step.commandPreset ?
            Array.isArray(step.commandPreset) ?
              step.commandPreset
            : [step.commandPreset]
          : [];

        if (commands.length === 0) continue;

        expect(
          step.objective.validate(state),
          `${lesson.id}/${step.title} should start unsolved`,
        ).toBe(false);

        for (let i = 0; i < commands.length - 1; i++) {
          state = run(
            state,
            commands[i]!,
            step.title === "Triggering a Merge Conflict",
          );
          expect(
            step.objective.validate(state),
            `${lesson.id}/${step.title} solved early after: ${commands.slice(0, i + 1).join(" | ")}`,
          ).toBe(false);
        }

        state = run(
          state,
          commands[commands.length - 1]!,
          step.title === "Triggering a Merge Conflict",
        );

        if (lesson.id === "recovery" && step.title === "Reverting a Commit") {
          expect(step.objective.validate(state)).toBe(false);
          state = run(state, `git revert ${state.branches.main!.commitId}`);
        }

        expect(
          step.objective.validate(state),
          `${lesson.id}/${step.title} should pass after full preset`,
        ).toBe(true);
      }
    }
  });
});

describe("lesson flow edge cases", () => {
  it("branching detached HEAD enters null currentBranch", () => {
    let state = seedLesson("branching");
    state = runAll(state, [
      "git branch feature/login",
      "git checkout feature/login",
      'echo "// login page logic" >> index.js',
      "git add index.js",
      'git commit -m "Add login framework"',
    ]);
    const firstCommit = getInitialCommitId(state);
    state = run(state, `git checkout ${firstCommit}`);
    expect(state.currentBranch).toBeNull();
    expect(state.HEAD).toBe(firstCommit);
  });

  it("rebase leaves an orphaned pre-rebase commit for cherry-pick lesson", () => {
    let state = seedLesson("rebase");
    state = runAll(state, [
      "git checkout -b feature/rebase",
      'echo "feat" > index.js',
      "git add index.js",
      'git commit -m "feature commit"',
      "git checkout main",
      'echo "main change" > index.js',
      "git add index.js",
      'git commit -m "main commit"',
      "git checkout feature/rebase",
      "git rebase main",
    ]);
    expect(findOrphanCommit(state)).toBeTruthy();
  });

  it("rebase objective stays unsolved until git rebase runs", () => {
    const step = lessons
      .find((l) => l.id === "rebase")!
      .steps.find((s) => s.title === "Rebasing Commits")!;

    let state = seedLesson("rebase");
    state = runAll(state, [
      "git checkout -b feature/rebase",
      'echo "feat" > index.js',
      "git add index.js",
      'git commit -m "feature commit"',
    ]);
    expect(step.objective!.validate(state)).toBe(false);

    state = runAll(state, [
      "git checkout main",
      'echo "main change" > index.js',
      "git add index.js",
      'git commit -m "main commit"',
      "git checkout feature/rebase",
    ]);
    expect(step.objective!.validate(state)).toBe(false);

    state = run(state, "git rebase main");
    expect(step.objective!.validate(state)).toBe(true);
  });

  it("recovery reflog step can recover pre-reset commit", () => {
    let state = seedLesson("recovery");
    state = runAll(state, [
      'echo "// buggy code" >> index.js',
      "git add index.js",
      'git commit -m "Introduce a bug"',
    ]);
    const bugCommit = state.branches.main?.commitId;
    state = run(state, `git revert ${bugCommit}`);
    state = run(state, "git reset --hard HEAD~1");

    const resetAction = state.reflog.find((e) => e.action.includes("reset: "));
    expect(resetAction?.previousHead).toBeTruthy();

    state = run(state, `git checkout ${resetAction!.previousHead!}`);
    expect(state.HEAD).toBe(resetAction!.previousHead);
  });

  it("recovery reflog step passes with git checkout HEAD@{1}", () => {
    let state = seedLesson("recovery");
    state = runAll(state, [
      'echo "// buggy code" >> index.js',
      "git add index.js",
      'git commit -m "Introduce a bug"',
    ]);
    const bugCommit = state.branches.main?.commitId;
    state = run(state, `git revert ${bugCommit}`);
    state = run(state, "git reset --hard HEAD~1");
    state = run(state, "git checkout HEAD@{1}");

    const step = lessons
      .find((l) => l.id === "recovery")!
      .steps.find((s) => s.title === "The Magic of Reflog")!;
    expect(step.objective!.validate(state)).toBe(true);
  });

  it("merging conflict resolution creates merge commit with 2 parents", () => {
    let state = seedLesson("merging");
    state = runAll(state, [
      "git checkout -b feature/login",
      'echo "// login page logic" >> index.js',
      "git add index.js",
      'git commit -m "Add login framework"',
      "git checkout main",
      "git merge feature/login",
      "git checkout -b branch-a",
      'echo "A" > index.js',
      "git add index.js",
      'git commit -m "edit A"',
      "git checkout main",
      'echo "B" > index.js',
      "git add index.js",
      'git commit -m "edit B"',
    ]);
    state = run(state, "git merge branch-a", true);
    state = runAll(state, [
      'echo "Resolved Content" > index.js',
      "git add index.js",
      'git commit -m "Resolve merge conflict"',
    ]);

    const headId = state.branches.main?.commitId;
    const headCommit = headId ? state.commits[headId] : null;
    expect(headCommit?.parentIds.length).toBe(2);
    expect(
      Object.values(state.workingDirectory).some((f) =>
        f.content.includes("<<<<<<<"),
      ),
    ).toBe(false);
  });
});
