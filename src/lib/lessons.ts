import type { GitState } from "@/types/git";

export interface LessonObjective {
  description: string;
  validate: (state: GitState) => boolean;
}

export interface LessonStep {
  title: string;
  explanation: string;
  objective?: LessonObjective;
  commandPreset?: string | string[];
  quiz?: {
    question: string;
    options: string[];
    answerIdx: number;
    explanation: string;
  };
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  category: "Beginner" | "Advanced";
  steps: LessonStep[];
}

export const lessons: Lesson[] = [
  {
    id: "basics",
    title: "1. The Git Basics",
    description:
      "Learn how to initialize a repository, stage files, and commit changes.",
    category: "Beginner",
    steps: [
      {
        title: "Welcome to Git!",
        explanation: `Welcome to **GitControl**!\n\nGit is a tool that saves snapshots of your code as you work, so you can experiment freely, undo mistakes, and always get back to a version that worked, whether you're working alone or with a whole team (that's what "**version control**" means).\n\nIn this playground, you can experiment with real Git commands in the terminal and instantly see their effects on the commit graph and the files workspace.\n\nClick **Next** to begin!`,
      },
      {
        title: "Initializing a Repository",
        explanation: `Before Git can track your project, you must initialize a repository. This creates a hidden \`.git\` directory that stores the commit history and configurations.\n\n**Step to perform:**\n1. **Initialize the repository:** Create the version control database in this folder:\n\`git init\`\n\nRun this command in the terminal to initialize your workspace!`,
        objective: {
          description: "Initialize your Git repository.",
          validate: (state: GitState) => state.initialized,
        },
        commandPreset: "git init",
      },
      {
        title: "Creating a File",
        explanation: `Great job! You now have a Git repository. Let's create some files to track.\n\nYou can create or edit files in the **Working Directory** (Lane 1 on the right). Let's write a file named \`index.js\` using the terminal.\n\n**Step to perform:**\n1. **Create the file:** Write console logs into a new file named \`index.js\`:\n\`echo "console.log('Hello, Git!');" > index.js\`\n\n*(Alternatively, you can click the "+" button in the Working Directory UI to create a file visually!)*`,
        objective: {
          description: "Create or modify files in the working directory.",
          validate: (state: GitState) =>
            state.workingDirectory["index.js"] !== undefined,
        },
        commandPreset: "echo \"console.log('Hello, Git!');\" > index.js",
      },
      {
        title: "Staging Your Changes",
        explanation: `Now, look at the files explorer on the right. You have a new file in the **Working Directory** (marked in gray as **Untracked**).\n\nTo tell Git to include this file in the next snapshot, we must add it to the **Staging Area** (also called the index).\n\n**Step to perform:**\n1. **Stage the file:** Add \`index.js\` to the staging list:\n\`git add index.js\`\n\n*(Or click the "+" icon on the index.js file card in the Working Directory lane!)*`,
        objective: {
          description: "Stage the file index.js.",
          validate: (state: GitState) =>
            Object.keys(state.stagingArea).includes("index.js"),
        },
        commandPreset: "git add index.js",
      },
      {
        title: "Creating Your First Commit",
        explanation: `Excellent! The file is now in the **Staging Area** (Lane 2, colored blue). \n\nNow, let's lock in these changes by creating a **Commit**. A commit is a permanent snapshot of your project's files at this point in time.\n\n**Step to perform:**\n1. **Create the commit snapshot:** Permanently save your staged changes with a descriptive label:\n\`git commit -m "Initial commit"\`\n\nRun this command and watch the staged files fly into a new commit node in the **Commit Graph**!`,
        objective: {
          description: "Make a commit with a message.",
          validate: (state: GitState) => {
            const tipId = state.branches["main"]?.commitId;
            const tip = tipId ? state.commits[tipId] : undefined;
            return !!(
              state.initialized &&
              tip &&
              tip.files["index.js"] !== undefined
            );
          },
        },
        commandPreset: 'git commit -m "Initial commit"',
      },
      {
        title: "Quiz: The 3 Stages of Git",
        explanation: `Before moving to branching, let's verify what you've learned. Answer the question below to complete the Basics lesson!`,
        quiz: {
          question:
            "Which Git stage represents changes that are ready to be included in the next commit snapshot?",
          options: [
            "Working Directory",
            "Staging Area (Index)",
            "Local Repository",
            "Stash Storage",
          ],
          answerIdx: 1,
          explanation:
            "The Staging Area (Index) is the middle ground where Git collects changes that will go into the next commit.",
        },
      },
    ],
  },
  {
    id: "branching",
    title: "2. Branching & Checkout",
    description:
      "Understand branch pointers, how to create branches, switch between them, and detached HEAD mode.",
    category: "Beginner",
    steps: [
      {
        title: "What is a Branch?",
        explanation: `In Git, branches are lightweight, moveable pointers that point to specific commits.\n\nBy default, you start on the \`main\` branch. Creating branches allows you to work on new features, bug fixes, or experiments in isolation without affecting the main line of code.\n\nClick **Next** to create a branch!`,
      },
      {
        title: "Creating a Branch",
        explanation: `Let's create a new branch named \`feature/login\` to simulate starting work on a login screen.\n\n**Step to perform:**\n1. **Create the branch pointer:** Define a new isolated line of history named \`feature/login\`:\n\`git branch feature/login\`\n\nSee how a new pointer label appeared pointing to your initial commit!`,
        objective: {
          description: "Create a branch named 'feature/login'.",
          validate: (state: GitState) =>
            state.branches["feature/login"] !== undefined,
        },
        commandPreset: "git branch feature/login",
      },
      {
        title: "Switching Branches",
        explanation: `Although you created the branch, you are still actively on the \`main\` branch. We can verify this because the \`HEAD\` indicator points to \`main\`.\n\nLet's switch to our new branch to start committing changes there.\n\n**Step to perform:**\n1. **Checkout the feature branch:** Switch the active workspace to \`feature/login\`:\n\`git checkout feature/login\`\n*(or \`git switch feature/login\`)*`,
        objective: {
          description: "Switch your active branch to 'feature/login'.",
          validate: (state: GitState) =>
            state.currentBranch === "feature/login",
        },
        commandPreset: "git checkout feature/login",
      },
      {
        title: "Committing on a Branch",
        explanation: `Let's make a change on our branch! We need to follow these steps:\n\n1. **Modify the file:** Add some login code to our file:\n\`echo "// login page logic" >> index.js\`\n\n2. **Stage the changes:** Prepare the file to be committed:\n\`git add index.js\`\n\n3. **Commit the work:** Save the snapshot on our feature branch:\n\`git commit -m "Add login framework"\`\n\nWatch the \`feature/login\` pointer advance ahead in the commit graph, while \`main\` stays exactly where it was. That gap between them is what "your branch is ahead" means. The history will only visually fork once \`main\` gets a commit of its own too.`,
        objective: {
          description: "Stage and commit a change on the feature branch.",
          validate: (state: GitState) => {
            const feat = state.branches["feature/login"]?.commitId || "";
            const main = state.branches["main"]?.commitId || "";
            return !!(
              feat &&
              main &&
              feat !== main &&
              state.commits[feat]?.parentIds.includes(main)
            );
          },
        },
        commandPreset: [
          'echo "// login page logic" >> index.js',
          "git add index.js",
          'git commit -m "Add login framework"',
        ],
      },
      {
        title: "Detached HEAD Mode",
        explanation: `If you checkout a specific commit hash instead of a branch, Git enters a state called **Detached HEAD**.\n\nIn this mode, HEAD points directly to a commit rather than a branch label. **Be careful here:** if you make new commits while detached and then switch to a branch without first saving your work (e.g. with \`git branch new-name\`), those commits can become orphaned and hard to find. As you'll see in the Recovery lesson, Git almost never truly deletes them.\n\nLet's see this in action by checking out your first commit. Find its hash (e.g. from the commit graph or log) and check it out.\n\n**Step to perform:**\n1. **Checkout a commit hash directly:** Point HEAD straight to the commit hash without attaching to any branch label:\n\`git checkout <first-commit-hash>\``,
        objective: {
          description:
            "Enter Detached HEAD mode by checking out a commit hash.",
          validate: (state: GitState) =>
            state.currentBranch === null &&
            state.HEAD !== "main" &&
            state.HEAD !== "",
        },
        commandPreset: "git checkout <first-commit-hash>",
      },
    ],
  },
  {
    id: "merging",
    title: "3. Merging & Conflicts",
    description:
      "Learn how to bring changes from different branches back together, including fast-forwards and merge conflicts.",
    category: "Beginner",
    steps: [
      {
        title: "Bringing History Together",
        explanation: `Once work on a feature branch is completed, you want to merge it back into your primary branch (usually \`main\`).\n\nThere are two main merge scenarios:\n1. **Fast-forward**: Your current branch hasn't moved since the branch you're merging in was created. Git just slides your branch pointer forward to match. No new commit is created.\n2. **Three-way merge**: Both branches have new commits since they diverged. Git creates a **merge commit** with two parents to join them.\n\nYou'll try each one. First a fast-forward, then a clean three-way merge, then a three-way merge that hits a conflict.\n\nClick **Next** to set up a feature branch.`,
      },
      {
        title: "Preparing a Feature Branch",
        explanation: `To see a fast-forward, \`feature/login\` must move ahead while \`main\` stays put.\n\n**Steps to perform:**\n1. **Create and switch to a feature branch:**\n\`git checkout -b feature/login\`\n\n2. **Make a change:**\n\`echo "// login page logic" >> index.js\`\n\n3. **Stage and commit the change:**\n\`git add index.js\`\n\`git commit -m "Add login framework"\`\n\nIn the graph, \`feature/login\` should sit one commit ahead of \`main\`.`,
        objective: {
          description: "Create feature/login and commit on it, ahead of main.",
          validate: (state: GitState) => {
            const feat = state.branches["feature/login"]?.commitId || "";
            const main = state.branches["main"]?.commitId || "";
            return !!(
              feat &&
              main &&
              feat !== main &&
              state.commits[feat]?.parentIds.includes(main)
            );
          },
        },
        commandPreset: [
          "git checkout -b feature/login",
          'echo "// login page logic" >> index.js',
          "git add index.js",
          'git commit -m "Add login framework"',
        ],
      },
      {
        title: "Switching back to Main",
        explanation: `Merges always apply *into the branch you are on*. \`feature/login\` is ahead, so switch back to \`main\` before merging.\n\n**Step to perform:**\n1. **Checkout main:**\n\`git checkout main\`\n\n\`HEAD\` / \`main\` return to the older commit. \`feature/login\` stays ahead.`,
        objective: {
          description: "Checkout the 'main' branch.",
          validate: (state: GitState) => {
            const feat = state.branches["feature/login"]?.commitId || "";
            const main = state.branches["main"]?.commitId || "";
            return (
              state.currentBranch === "main" &&
              !!feat &&
              !!main &&
              feat !== main
            );
          },
        },
        commandPreset: "git checkout main",
      },
      {
        title: "Fast-forward Merge",
        explanation: `Now merge \`feature/login\` into \`main\`.\n\nBecause \`main\` has no unique commits since the branch point, Git can **fast-forward**: it moves the \`main\` pointer to the same commit as \`feature/login\`. History stays a straight line. No merge commit appears.\n\n**Step to perform:**\n1. **Merge the feature branch:**\n\`git merge feature/login\`\n\nWatch \`main\` jump forward to match \`feature/login\`.`,
        objective: {
          description: "Merge feature/login into main.",
          validate: (state: GitState) => {
            const main = state.branches["main"]?.commitId || "";
            const feat = state.branches["feature/login"]?.commitId || "";
            return !!(
              main &&
              feat &&
              main === feat &&
              state.currentBranch === "main" &&
              state.reflog.some((e) =>
                e.action.includes("merge feature/login: Fast-forward"),
              )
            );
          },
        },
        commandPreset: "git merge feature/login",
      },
      {
        title: "A Clean Three-way Merge",
        explanation: `Fast-forward only works when one side has not moved. If *both* branches gain commits, Git needs a **three-way merge** and creates a new commit with two parents.\n\nWe'll edit *different* files so the merge succeeds with no conflict:\n\n1. **Branch for docs work:**\n\`git checkout -b feature/docs\`\n\n2. **Change README only:**\n\`echo "Login docs" >> README.md\`\n\`git add README.md\`\n\`git commit -m "Add login docs"\`\n\n3. **Return to main and change index.js only:**\n\`git checkout main\`\n\`echo "// helper util" >> index.js\`\n\`git add index.js\`\n\`git commit -m "Add helper util"\`\n\n4. **Merge the docs branch:**\n\`git merge feature/docs\`\n\nThe graph should fork, then join with a merge commit. Both \`README.md\` and \`index.js\` changes should be present.`,
        objective: {
          description:
            "Create diverging commits on different files, then merge feature/docs into main.",
          validate: (state: GitState) => {
            const mainId = state.branches["main"]?.commitId || "";
            const mainCommit = mainId ? state.commits[mainId] : undefined;
            const docsId = state.branches["feature/docs"]?.commitId || "";
            return !!(
              state.currentBranch === "main" &&
              mainCommit &&
              mainCommit.parentIds.length > 1 &&
              docsId &&
              mainCommit.parentIds.includes(docsId) &&
              mainCommit.files["README.md"]?.includes("Login docs") &&
              mainCommit.files["index.js"]?.includes("helper util") &&
              state.reflog.some((e) =>
                e.action.includes("merge feature/docs"),
              ) &&
              !Object.values(state.workingDirectory).some((f) =>
                f.content.includes("<<<<<<<"),
              )
            );
          },
        },
        commandPreset: [
          "git checkout -b feature/docs",
          'echo "Login docs" >> README.md',
          "git add README.md",
          'git commit -m "Add login docs"',
          "git checkout main",
          'echo "// helper util" >> index.js',
          "git add index.js",
          'git commit -m "Add helper util"',
          "git merge feature/docs",
        ],
      },
      {
        title: "Triggering a Merge Conflict",
        explanation: `A three-way merge only auto-combines cleanly when the edits do not clash. If both sides change the *same lines* of the same file, Git pauses and asks you to decide.\n\n1. **Create and switch to a branch:**\n\`git checkout -b branch-a\`\n\n2. **Rewrite index.js on this branch:**\n\`echo "A" > index.js\`\n\`git add index.js\`\n\`git commit -m "edit A"\`\n\n3. **Switch back to main:**\n\`git checkout main\`\n\n4. **Rewrite the same file differently on main:**\n\`echo "B" > index.js\`\n\`git add index.js\`\n\`git commit -m "edit B"\`\n\n5. **Merge and hit the conflict:**\n\`git merge branch-a\`\n\nYou should see conflict markers in \`index.js\` and a paused merge (no merge commit yet).`,
        objective: {
          description:
            "Trigger a merge conflict by running git merge branch-a.",
          validate: (state: GitState) => {
            return Object.values(state.workingDirectory).some((f) =>
              f.content.includes("<<<<<<< HEAD"),
            );
          },
        },
        commandPreset: [
          "git checkout -b branch-a",
          'echo "A" > index.js',
          "git add index.js",
          'git commit -m "edit A"',
          "git checkout main",
          'echo "B" > index.js',
          "git add index.js",
          'git commit -m "edit B"',
          "git merge branch-a",
        ],
      },
      {
        title: "Resolving Conflicts",
        explanation: `Git paused with: \n\`Automatic merge failed; fix conflicts and then commit the result.\`\n\n\`index.js\` contains conflict markers, and the resolver dialog lets you compare both sides (\`B\` from \`main\` / HEAD, \`A\` from \`branch-a\`).\n\n1. **Choose the final content** (dialog buttons, or overwrite the file):\n\`echo "Resolved Content" > index.js\`\n\n2. **Stage the resolved file:**\n\`git add index.js\`\n\n3. **Finish the merge with a commit:**\n\`git commit -m "Resolve merge conflict"\`\n\nThat creates the merge commit: one node with **two parents**, tying \`main\` and \`branch-a\` back together.`,
        objective: {
          description: "Resolve the conflict, stage the file, and commit.",
          validate: (state: GitState) => {
            const hasConflictMarkers = Object.values(
              state.workingDirectory,
            ).some((f) => f.content.includes("<<<<<<<"));
            const headCommitId = state.branches["main"]?.commitId || "";
            const headCommit =
              headCommitId ? state.commits[headCommitId] : null;
            return (
              !hasConflictMarkers &&
              !!(headCommit && headCommit.parentIds.length > 1)
            );
          },
        },
        commandPreset: [
          'echo "Resolved Content" > index.js',
          "git add index.js",
          'git commit -m "Resolve merge conflict"',
        ],
      },
    ],
  },
  {
    id: "rebase",
    title: "4. Rebase & Cherry-Pick",
    description:
      "Discover alternative history-rewriting tools: git rebase and git cherry-pick.",
    category: "Advanced",
    steps: [
      {
        title: "Rebase vs. Merge",
        explanation: `Merging preserves history exactly as it happened, but leaves the graph a little messy with an extra merge commit. \n\n**Rebase** takes the commits you created on a branch, "rewinds" them, and replays them one-by-one on top of the target branch's latest commit. This results in a perfectly linear project history.\n\n**Important:** never rebase commits that have already been pushed and shared with others. Rebase rewrites each commit into a brand-new one with a different hash, so doing this on shared history forces everyone else to reconcile two conflicting timelines. Only rebase branches that are still private to you, like a local feature branch nobody else has pulled yet.\n\nLet's set up a rebase challenge. Click **Next**!`,
      },
      {
        title: "Rebasing Commits",
        explanation: `Let's say we have a feature branch that is behind \`main\`. We want to rebase it onto \`main\` so it includes main's changes and places feature commits cleanly on top.\n\nTo keep the demo conflict-free, the branches edit *different* files. (If both rewrote the same lines, real Git would pause for a rebase conflict.)\n\n1. **Create and switch to a feature branch:**\n\`git checkout -b feature/rebase\`\n\n2. **Add a feature-only file and commit:**\n\`echo "login feature" > feature.js\`\n\`git add feature.js\`\n\`git commit -m "feature commit"\`\n\n3. **Switch to main:** Go back to main to simulate updates happening there:\n\`git checkout main\`\n\n4. **Update docs on main:**\n\`echo "updated docs" > README.md\`\n\`git add README.md\`\n\`git commit -m "main commit"\`\n\n5. **Switch back to the feature branch:** Ready to update it:\n\`git checkout feature/rebase\`\n\n6. **Rebase onto main:** Move your feature commits to sit on top of main's latest commit:\n\`git rebase main\`\n\nWatch the graph: a *new* feature commit appears on top of main, and the tip should contain both \`README.md\` (from main) and \`feature.js\` (from your work). The original pre-rebase commit is left floating with no branch tip.`,
        objective: {
          description:
            "Rebase feature/rebase onto main so the tip sits on main and keeps both sides' files.",
          validate: (state: GitState) => {
            const featCId = state.branches["feature/rebase"]?.commitId;
            const mainCId = state.branches["main"]?.commitId;
            if (!featCId || !mainCId || featCId === mainCId) return false;

            const featCommit = state.commits[featCId];
            const mainCommit = state.commits[mainCId];
            return (
              featCommit?.parentIds[0] === mainCId &&
              !!featCommit.message.includes("(rebased)") &&
              featCommit.files["feature.js"] !== undefined &&
              featCommit.files["README.md"] === mainCommit?.files["README.md"]
            );
          },
        },
        commandPreset: [
          "git checkout -b feature/rebase",
          'echo "login feature" > feature.js',
          "git add feature.js",
          'git commit -m "feature commit"',
          "git checkout main",
          'echo "updated docs" > README.md',
          "git add README.md",
          'git commit -m "main commit"',
          "git checkout feature/rebase",
          "git rebase main",
        ],
      },
      {
        title: "Cherry-Picking a Commit",
        explanation: `Sometimes you don't want to merge or rebase a whole branch. You just want to copy *one single commit* from another branch onto your current branch.\n\nThis is called **Cherry-Picking**.\n\nAfter the rebase, \`feature/rebase\` already has a replayed copy of the feature work. The *original* pre-rebase "feature commit" still floats in the graph. \`main\` has the docs update but *not* \`feature.js\` yet, so cherry-picking that orphan onto \`main\` is a clear, visible copy.\n\n**Steps to perform:**\n1. **Switch to main:**\n\`git checkout main\`\n\n2. **Cherry-pick the orphaned feature commit:** Find the floating pre-rebase hash in the graph:\n\`git cherry-pick <commit-hash>\`\n\nYou should see a new commit on \`main\` that adds \`feature.js\` while keeping the updated \`README.md\`.`,
        objective: {
          description:
            "Checkout main, then cherry-pick the orphaned feature commit onto it.",
          validate: (state: GitState) => {
            const mainId = state.branches["main"]?.commitId || "";
            const commit = mainId ? state.commits[mainId] : undefined;
            return !!(
              state.currentBranch === "main" &&
              commit?.message.includes("(cherry-picked)") &&
              commit.message.includes("feature commit") &&
              commit.files["feature.js"] !== undefined &&
              commit.files["README.md"] === "updated docs"
            );
          },
        },
        commandPreset: ["git checkout main", "git cherry-pick <commit-hash>"],
      },
    ],
  },
  {
    id: "recovery",
    title: "5. Recovery & Undoing",
    description:
      "Learn how to revert changes, reset your branch history safely, and restore lost commits via the Reflog.",
    category: "Advanced",
    steps: [
      {
        title: "Git is Safe",
        explanation: `One of Git's biggest strengths is that it's extremely difficult to permanently lose code once committed. \n\nIn this lesson, you will learn to:\n1. **git revert**: Safely undo a commit by publishing a new "inverse" commit.\n2. **git reset**: Move branch pointers backwards (soft, mixed, hard).\n3. **git reflog**: Recover "deleted" commits.\n\nClick **Next** to try reverting!`,
      },
      {
        title: "Reverting a Commit",
        explanation: `Let's say a commit introduced a bug, and you want to undo *just that change* without touching any of the good work that came before or after it.\n\nFirst, let's simulate that bad commit:\n\n1. **Introduce a bug:** Make a change and commit it, as if it were real (broken) code:\n\`echo "// buggy code" >> index.js\`\n\`git add index.js\`\n\`git commit -m "Introduce a bug"\`\n\nIf you have already pushed changes to a shared branch, you should *never* rewrite history using reset.\n\nInstead, use \`git revert\`. This creates a **new** commit that applies the exact opposite of the target commit's changes, undoing it without erasing or rewriting any history.\n\n2. **Revert the buggy commit:** Find its hash in the commit graph and revert it:\n\`git revert <bug-commit-hash>\``,
        objective: {
          description:
            "Commit a change, then revert it to safely undo its effects.",
          validate: (state: GitState) => {
            const headId =
              (state.currentBranch ?
                state.branches[state.currentBranch]?.commitId
              : state.HEAD) || "";
            return !!state.commits[headId]?.message.startsWith('Revert "');
          },
        },
        commandPreset: [
          'echo "// buggy code" >> index.js',
          "git add index.js",
          'git commit -m "Introduce a bug"',
          "git revert <bug-commit-hash>",
        ],
      },
      {
        title: "Resetting History",
        explanation: `If you haven't shared your branch with others, you can modify history locally using \`git reset\`.\n\n- \`--soft\`: Undoes commits, keeps files in staging.\n- \`--mixed\` (default): Undoes commits & stages, keeps files in working directory.\n- \`--hard\`: Destroys commits, staged changes, and working directory edits to match the target commit.\n\nYour branch tip is still the safe revert. Let's make a *new* local mistake, then hard-reset it away, without undoing the revert.\n\n1. **Create a throwaway WIP commit:**\n\`echo "// oops" >> index.js\`\n\`git add index.js\`\n\`git commit -m "WIP mistake"\`\n\n2. **Hard-reset one commit back:** Drop that WIP commit from the branch tip:\n\`git reset --hard HEAD~1\`\n\n\`main\` should point at the revert again. The WIP commit becomes unreachable from the branch (but still findable via reflog next).`,
        objective: {
          description:
            "Commit a WIP mistake, then hard-reset HEAD~1 to drop it (keeping the revert).",
          validate: (state: GitState) => {
            const tipId =
              (state.currentBranch ?
                state.branches[state.currentBranch]?.commitId
              : state.HEAD) || "";
            const tip = tipId ? state.commits[tipId] : undefined;
            const didReset = state.reflog.some(
              (e) =>
                e.action.includes("reset: ") &&
                e.action.includes("hard") &&
                e.action.includes("HEAD~1"),
            );
            return !!(
              didReset &&
              tip?.message.startsWith('Revert "') &&
              !tip.message.includes("WIP")
            );
          },
        },
        commandPreset: [
          'echo "// oops" >> index.js',
          "git add index.js",
          'git commit -m "WIP mistake"',
          "git reset --hard HEAD~1",
        ],
      },
      {
        title: "The Magic of Reflog",
        explanation: `Oh no! The hard reset dropped your "WIP mistake" commit from the branch tip.\n\nActually, Git doesn't delete commits immediately. HEAD changes are recorded in the **Reflog** (Reference Log).\n\nLet's look at the reflog to find that lost WIP commit and check it out:\n\n1. **View reference log history:**\n\`git reflog\`\n\n2. **Checkout the deleted commit:** The reset is at \`HEAD@{0}\`. The WIP commit lives at \`HEAD@{1}\`. Recover it with:\n\`git checkout HEAD@{1}\`\n\n*(You can also click the commit hash from \`HEAD@{1}\` in the terminal output or the reflog panel on the right.)*`,
        objective: {
          description:
            "Recover the lost WIP commit by checking it out from the reflog.",
          validate: (state: GitState) => {
            const reflogEntries = state.reflog;
            if (reflogEntries.length < 2) return false;
            const currentHead =
              (state.currentBranch ?
                state.branches[state.currentBranch]?.commitId
              : state.HEAD) || "";

            const resetAction = reflogEntries.find((e) =>
              e.action.includes("reset: "),
            );
            const recovered = currentHead ? state.commits[currentHead] : null;
            return !!(
              resetAction &&
              resetAction.previousHead === currentHead &&
              recovered?.message === "WIP mistake"
            );
          },
        },
        commandPreset: ["git reflog", "git checkout HEAD@{1}"],
      },
    ],
  },
  {
    id: "stash",
    title: "6. Shelving with Stash",
    description:
      "Learn how to stash temporary changes away to clean your workspace, and restore them later.",
    category: "Advanced",
    steps: [
      {
        title: "The Problem of Dirty Workspaces",
        explanation: `Imagine you are half-way through writing code on a feature branch, and someone asks you to fix a critical bug on \`main\` immediately.\n\nYou cannot switch branches because you have uncommitted changes that might conflict or get carried over.\n\nInstead of making a messy "work in progress" commit, you can use **Stash** to temporarily shelve your changes.\n\nClick **Next** to stash your work!`,
      },
      {
        title: "Stashing Changes",
        explanation: `Let's modify a file to make the workspace "dirty", then stash the changes step-by-step:\n\n1. **Make a local change:** Edit the file to simulate work-in-progress:\n\`echo "// work in progress" >> index.js\`\n\n2. **Stash the changes:** Shelve your changes to temporarily clean the workspace:\n\`git stash\`\n\nObserve how the files disappear from the Working Directory and Staging lanes, and move into the **Stash Stack** (Lane 3 under Stashes)!`,
        objective: {
          description: "Modify a file and run git stash.",
          validate: (state: GitState) => {
            const top = state.stash[0];
            const shelvedDirty =
              !!top && Object.keys(top.workingDirectory).length > 0;
            const worktreeClean = Object.values(state.workingDirectory).every(
              (f) => f.state === "committed",
            );
            return shelvedDirty && worktreeClean;
          },
        },
        commandPreset: ['echo "// work in progress" >> index.js', "git stash"],
      },
      {
        title: "Popping Changes",
        explanation: `Your workspace is now completely clean, and you are free to switch branches, fix bugs, or commit.\n\nOnce you are ready to resume, you can pop the shelved changes back into your workspace.\n\n**Step to perform:**\n1. **Pop changes from the stash stack:** Apply the stashed changes back and remove them from the shelf:\n\`git stash pop\`\n\nWatch the files fly from the Stash storage back into your Working Directory!`,
        objective: {
          description: "Pop changes back from the stash list.",
          validate: (state: GitState) =>
            state.stash.length === 0 &&
            !!state.workingDirectory["index.js"]?.content.includes(
              "work in progress",
            ) &&
            Object.values(state.workingDirectory).some(
              (f) => f.state === "modified" || f.state === "staged",
            ),
        },
        commandPreset: "git stash pop",
      },
      {
        title: "Lesson Complete!",
        explanation: `Congratulations! You have completed all lessons on GitControl. \n\nYou now understand the core commands, branching model, merge behaviors, rebasing, recovery, and shelving.\n\nFeel free to explore the **Free Play Sandbox** mode in the scenario selector to run any Git commands you like!`,
      },
    ],
  },
];
