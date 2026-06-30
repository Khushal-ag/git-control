import type { GitState } from "@/types/git";

export interface LessonObjective {
  description: string;
  validate: (state: GitState) => boolean;
}

export interface LessonStep {
  title: string;
  explanation: string; // Markdown supported
  objective?: LessonObjective;
  commandPreset?: string;
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
        explanation: `Welcome to **GitControl**!\n\nGit is a distributed version control system that tracks changes in your source code during development. \n\nIn this playground, you can experiment with Git concepts by executing commands in the terminal and instantly seeing their visual effects on the commit graph and the files workspace.\n\nClick **Next** to begin!`,
      },
      {
        title: "Initializing a Repository",
        explanation: `Before Git can track your project, you must initialize a repository. This creates a hidden \`.git\` directory that stores the commit history and configurations.\n\n**Command to run:**\n\`git init\`\n\nRun this command in the terminal to initialize your workspace!`,
        objective: {
          description: "Initialize your Git repository.",
          validate: (state: GitState) => state.initialized,
        },
        commandPreset: "git init",
      },
      {
        title: "Creating a File",
        explanation: `Great job! You now have a Git repository. Let's create some files to track.\n\nYou can create or edit files in the **Working Directory** (Lane 1 on the right). \n\nLet's write a file named \`index.js\` using the terminal.\n\n**Command to run:**\n\`echo "console.log('Hello, Git!');" > index.js\`\n\n*(Alternatively, you can click the "+" button in the Working Directory UI to create a file visually!)*`,
        objective: {
          description: "Create or modify files in the working directory.",
          validate: (state: GitState) =>
            Object.keys(state.workingDirectory).length > 0,
        },
        commandPreset: "echo \"console.log('Hello, Git!');\" > index.js",
      },
      {
        title: "Staging Your Changes",
        explanation: `Now, look at the files explorer on the right. You have a new file in the **Working Directory** (marked in gray as **Untracked**).\n\nTo tell Git to include this file in the next snapshot, we must add it to the **Staging Area** (also called the index).\n\n**Command to run:**\n\`git add index.js\`\n\n*(Or click the "+" icon on the index.js file card in the Working Directory lane!)*`,
        objective: {
          description: "Stage the file index.js.",
          validate: (state: GitState) =>
            Object.keys(state.stagingArea).includes("index.js"),
        },
        commandPreset: "git add index.js",
      },
      {
        title: "Creating Your First Commit",
        explanation: `Excellent! The file is now in the **Staging Area** (Lane 2, colored blue). \n\nNow, let's lock in these changes by creating a **Commit**. A commit is a permanent snapshot of your project's files at this point in time.\n\n**Command to run:**\n\`git commit -m "Initial commit"\`\n\nRun this command and watch the staged files fly into a new commit node in the **Commit Graph**!`,
        objective: {
          description: "Make a commit with a message.",
          validate: (state: GitState) => Object.keys(state.commits).length > 0,
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
        explanation: `Let's create a new branch named \`feature/login\` to simulate starting work on a login screen.\n\n**Command to run:**\n\`git branch feature/login\`\n\nSee how a new pointer label appeared pointing to your initial commit!`,
        objective: {
          description: "Create a branch named 'feature/login'.",
          validate: (state: GitState) =>
            state.branches["feature/login"] !== undefined,
        },
        commandPreset: "git branch feature/login",
      },
      {
        title: "Switching Branches",
        explanation: `Although you created the branch, you are still actively on the \`main\` branch. We can verify this because the \`HEAD\` indicator points to \`main\`.\n\nLet's switch to our new branch to start committing changes there.\n\n**Command to run:**\n\`git checkout feature/login\` \n*(or \`git switch feature/login\`)*`,
        objective: {
          description: "Switch your active branch to 'feature/login'.",
          validate: (state: GitState) =>
            state.currentBranch === "feature/login",
        },
        commandPreset: "git checkout feature/login",
      },
      {
        title: "Committing on a Branch",
        explanation: `Let's make a change on our branch! First, edit the file content or create a new file, stage it, and commit it.\n\n**Commands to run:**\n\`echo "// login page logic" >> index.js\`\n\`git add index.js\`\n\`git commit -m "Add login framework"\`\n\nWatch the commit graph branch out and the \`feature/login\` pointer advance, while \`main\` stays behind!`,
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
        commandPreset:
          'echo "// login page logic" >> index.js && git add index.js && git commit -m "Add login framework"',
      },
      {
        title: "Detached HEAD Mode",
        explanation: `If you checkout a specific commit hash instead of a branch, Git enters a state called **Detached HEAD**.\n\nIn this mode, HEAD points directly to a commit rather than a branch label. Let's see this in action by checking out your first commit.\n\nFind the hash of your first commit (e.g. from the commit graph or log) and check it out.\n\n**Command to run:**\n\`git checkout <first-commit-hash>\``,
        objective: {
          description:
            "Enter Detached HEAD mode by checking out a commit hash.",
          validate: (state: GitState) =>
            state.currentBranch === null &&
            state.HEAD !== "main" &&
            state.HEAD !== "",
        },
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
        explanation: `Once work on a feature branch is completed, you want to merge it back into your primary branch (usually \`main\`).\n\nThere are two main merge scenarios:\n1. **Fast-forward**: The target branch has progressed linearly from the merge point. Git just moves the branch pointer forward.\n2. **Three-way merge**: Both branches have progressed independently. Git creates a new **merge commit** with two parents.\n\nClick **Next** to try a Fast-forward merge.`,
      },
      {
        title: "Switching back to Main",
        explanation: `To merge changes *into* \`main\`, you must first be on the \`main\` branch.\n\nLet's switch back to \`main\`.\n\n**Command to run:**\n\`git checkout main\``,
        objective: {
          description: "Checkout the 'main' branch.",
          validate: (state: GitState) => state.currentBranch === "main",
        },
        commandPreset: "git checkout main",
      },
      {
        title: "Fast-forward Merge",
        explanation: `Now that you're on \`main\`, let's merge the changes from \`feature/login\`.\n\nSince \`main\` hasn't had any commits since you branched off, this will be a simple Fast-forward.\n\n**Command to run:**\n\`git merge feature/login\`\n\nObserve how the \`main\` pointer simply jumps to match \`feature/login\`!`,
        objective: {
          description: "Merge feature/login into main.",
          validate: (state: GitState) => {
            const main = state.branches["main"]?.commitId || "";
            const feat = state.branches["feature/login"]?.commitId || "";
            return !!(main && feat && main === feat);
          },
        },
        commandPreset: "git merge feature/login",
      },
      {
        title: "Triggering a Merge Conflict",
        explanation: `What happens if you modify the same line of a file in two different branches?\n\nLet's create a merge conflict! \n1. Create a branch \`branch-a\` and checkout, change \`index.js\` content to "A", stage and commit.\n2. Switch back to \`main\`, change \`index.js\` content to "B", stage and commit.\n3. Try to merge \`branch-a\` into \`main\`.\n\n**Commands to run (in sequence):**\n\`git checkout -b branch-a\`\n\`echo "A" > index.js && git add index.js && git commit -m "edit A"\`\n\`git checkout main\`\n\`echo "B" > index.js && git add index.js && git commit -m "edit B"\`\n\`git merge branch-a\``,
        objective: {
          description:
            "Trigger a merge conflict by running git merge branch-a.",
          validate: (state: GitState) => {
            // Check if any file in working directory contains conflict markers
            return Object.values(state.workingDirectory).some((f) =>
              f.content.includes("<<<<<<< HEAD"),
            );
          },
        },
        commandPreset:
          'git checkout -b branch-a && echo "A" > index.js && git add index.js && git commit -m "edit A" && git checkout main && echo "B" > index.js && git add index.js && git commit -m "edit B" && git merge branch-a',
      },
      {
        title: "Resolving Conflicts",
        explanation: `Git has paused the merge and outputted: \n\`Automatic merge failed; fix conflicts and then commit the result.\`\n\nLook at \`index.js\` in the files panel. Git added conflict markers. \n\nYou can resolve this by editing the file to remove markers and select the desired content (or click the resolve buttons that appeared in the UI), then run \`git add\` and \`git commit\` to finish the merge commit.\n\n**Commands to run:**\n\`echo "Resolved Content" > index.js\`\n\`git add index.js\`\n\`git commit -m "Resolve merge conflict"\``,
        objective: {
          description: "Resolve the conflict, stage the file, and commit.",
          validate: (state: GitState) => {
            // Check if conflict markers are gone, and a new commit is created
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
        commandPreset:
          'echo "Resolved Content" > index.js && git add index.js && git commit -m "Resolve merge conflict"',
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
        explanation: `Merging adds a merge commit, leaving the branches history intact but messy. \n\n**Rebase** takes the commits you created on a branch, "rewinds" them, and replays them one-by-one on top of the target branch's latest commit. This results in a perfectly linear project history.\n\nLet's set up a rebase challenge. Click **Next**!`,
      },
      {
        title: "Rebasing Commits",
        explanation: `Let's say we have a feature branch that is behind \`main\`. We want to rebase it onto \`main\` so it includes main's changes and places feature commits cleanly on top.\n\n**Commands to execute:**\n\`git checkout -b feature/rebase\`\n\`echo "feat" > index.js && git add index.js && git commit -m "feature commit"\`\n\`git checkout main\`\n\`echo "main change" > index.js && git add index.js && git commit -m "main commit"\`\n\`git checkout feature/rebase\`\n\`git rebase main\`\n\nNotice how the feature commit is copied and moved to sit on top of the main commit!`,
        objective: {
          description: "Perform git rebase main on feature/rebase branch.",
          validate: (state: GitState) => {
            const featCId = state.branches["feature/rebase"]?.commitId;
            const mainCId = state.branches["main"]?.commitId;
            if (!featCId || !mainCId) return false;

            // Traverse feature commits to verify main's latest commit is in the parent history
            let curr = featCId;
            let foundMain = false;
            while (curr) {
              if (curr === mainCId) {
                foundMain = true;
                break;
              }
              const commit = state.commits[curr];
              curr = commit?.parentIds[0] || "";
            }
            return foundMain && featCId !== mainCId;
          },
        },
        commandPreset:
          'git checkout -b feature/rebase && echo "feat" > index.js && git add index.js && git commit -m "feature commit" && git checkout main && echo "main change" > index.js && git add index.js && git commit -m "main commit" && git checkout feature/rebase && git rebase main',
      },
      {
        title: "Cherry-Picking a Commit",
        explanation: `Sometimes you don't want to merge or rebase a whole branch. You just want to copy *one single commit* from another branch onto your current branch.\n\nThis is called **Cherry-Picking**.\n\nLet's cherry-pick a commit. Find a commit hash in your graph that is not on your current active branch (e.g. from the \`feature/login\` or other branch) and cherry-pick it.\n\n**Command to run:**\n\`git cherry-pick <commit-hash>\``,
        objective: {
          description: "Cherry-pick a commit onto your active branch.",
          validate: (state: GitState) => {
            const headCId =
              (state.currentBranch ?
                state.branches[state.currentBranch]?.commitId
              : state.HEAD) || "";
            const commit = state.commits[headCId];
            return !!(
              commit !== undefined && commit.message.includes("(cherry-picked)")
            );
          },
        },
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
        explanation: `Let's say a commit introduced a bug, and you want to undo it. If you have already pushed changes to a shared branch, you should *never* rewrite history using reset.\n\nInstead, use \`git revert\`. This creates a new commit that applies the exact opposite changes of the target commit.\n\nChoose the last commit hash in your log and revert it.\n\n**Command to run:**\n\`git revert <last-commit-hash>\``,
        objective: {
          description: "Revert the last commit to undo its changes.",
          validate: (state: GitState) => {
            const headId =
              (state.currentBranch ?
                state.branches[state.currentBranch]?.commitId
              : state.HEAD) || "";
            return !!state.commits[headId]?.message.startsWith('Revert "');
          },
        },
      },
      {
        title: "Resetting History",
        explanation: `If you haven't shared your branch with others, you can modify history locally using \`git reset\`.\n\n- \`--soft\`: Undoes commits, keeps files in staging.\n- \`--mixed\` (default): Undoes commits & stages, keeps files in working directory.\n- \`--hard\`: Destroys commits, staged changes, and working directory edits to match the target commit.\n\nLet's run a hard reset to remove the last commit.\n\n**Command to run:**\n\`git reset --hard HEAD~1\``,
        objective: {
          description: "Perform a hard reset to HEAD~1.",
          validate: (state: GitState) => {
            // Find hard reset in reflog
            return state.reflog.some(
              (e) => e.action.includes("reset: ") && e.action.includes("hard"),
            );
          },
        },
        commandPreset: "git reset --hard HEAD~1",
      },
      {
        title: "The Magic of Reflog",
        explanation: `Oh no! You performed a hard reset and "lost" your commit! \n\nActually, Git doesn't delete commits immediately. HEAD changes are recorded in the **Reflog** (Reference Log).\n\nLet's look at the reflog to find the hash of the commit you just deleted, and check it out to recover it!\n\n**Command to run:**\n\`git reflog\`\n\nFind the commit hash prior to the reset (e.g. \`HEAD@{1}\`) and check it out:\n\`git checkout <commit-hash>\``,
        objective: {
          description:
            "Recover the lost commit by checking its hash out from the reflog.",
          validate: (state: GitState) => {
            // Checked out a commit directly that matches the pre-reset commit hash in reflog history
            const reflogEntries = state.reflog;
            if (reflogEntries.length < 2) return false;
            const currentHead =
              (state.currentBranch ?
                state.branches[state.currentBranch]?.commitId
              : state.HEAD) || "";

            // Check if current HEAD is a hash that matches previousHead of the reset action
            const resetAction = reflogEntries.find((e) =>
              e.action.includes("reset: "),
            );
            return !!(resetAction && resetAction.previousHead === currentHead);
          },
        },
      },
    ],
  },
  {
    id: "stash",
    title: "6. Shelving with Stash",
    description:
      "Learn how to stash temporary changes away to clean your workspace, and apply them back later.",
    category: "Advanced",
    steps: [
      {
        title: "The Problem of Dirty Workspaces",
        explanation: `Imagine you are half-way through writing code on a feature branch, and someone asks you to fix a critical bug on \`main\` immediately.\n\nYou cannot switch branches because you have uncommitted changes that might conflict or get carried over.\n\nInstead of making a messy "work in progress" commit, you can use **Stash** to temporarily shelve your changes.\n\nClick **Next** to stash your work!`,
      },
      {
        title: "Stashing Changes",
        explanation: `Let's modify a file to make the workspace "dirty", then stash the changes.\n\n**Commands to execute:**\n\`echo "// work in progress" >> index.js\`\n\`git stash\`\n\nObserve how the files disappear from the Working Directory and Staging lanes, and move into the **Stash Stack** (Lane 3 under Stashes)!`,
        objective: {
          description: "Modify a file and run git stash.",
          validate: (state: GitState) => state.stash.length > 0,
        },
        commandPreset: 'echo "// work in progress" >> index.js && git stash',
      },
      {
        title: "Popping Changes",
        explanation: `Your workspace is now completely clean, and you are free to switch branches, fix bugs, or commit.\n\nOnce you are ready to resume, you can pop the shelved changes back into your workspace.\n\n**Command to run:**\n\`git stash pop\`\n\nWatch the files fly from the Stash storage back into your Working Directory!`,
        objective: {
          description: "Pop changes back from the stash list.",
          validate: (state: GitState) => state.stash.length === 0,
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
