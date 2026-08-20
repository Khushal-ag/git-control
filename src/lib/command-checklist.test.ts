import { describe, expect, it } from "vitest";

import { getCommandDoneFlags } from "@/lib/command-checklist";

describe("getCommandDoneFlags", () => {
  const mergeConflictStep = [
    "git checkout -b branch-a",
    'echo "A" > index.js',
    "git add index.js",
    'git commit -m "edit A"',
    "git checkout main",
    'echo "B" > index.js',
    "git add index.js",
    'git commit -m "edit B"',
    "git merge branch-a",
  ];

  it("does not mark a later duplicate command as done until earlier steps match", () => {
    const log = [
      "git checkout -b branch-a",
      'echo "A" > index.js',
      "git add index.js",
      'git commit -m "edit A"',
    ];

    const flags = getCommandDoneFlags(mergeConflictStep, log);

    expect(flags.slice(0, 4)).toEqual([true, true, true, true]);
    expect(flags.slice(4)).toEqual([false, false, false, false, false]);
  });

  it("matches duplicate commands in order as the learner progresses", () => {
    const log = [
      "git checkout -b branch-a",
      'echo "A" > index.js',
      "git add index.js",
      'git commit -m "edit A"',
      "git checkout main",
      'echo "B" > index.js',
      "git add index.js",
    ];

    const flags = getCommandDoneFlags(mergeConflictStep, log);

    expect(flags).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("treats git switch as checkout when matching", () => {
    const flags = getCommandDoneFlags(
      ["git checkout main"],
      ["git switch main"],
    );
    expect(flags).toEqual([true]);
  });

  it("matches placeholder hashes like git revert <bug-commit-hash>", () => {
    const flags = getCommandDoneFlags(
      ['git commit -m "Introduce a bug"', "git revert <bug-commit-hash>"],
      ['git commit -m "Introduce a bug"', "git revert a1b2c3d"],
    );
    expect(flags).toEqual([true, true]);
  });
});
