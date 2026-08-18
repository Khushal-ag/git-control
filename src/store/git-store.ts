import { create } from "zustand";

import type { FileState, GitState } from "@/types/git";

import { createInitialState, executeGitCommand } from "@/lib/git-engine";
import { lessons } from "@/lib/lessons";

interface GitStore {
  gitState: GitState;
  historyStack: GitState[];
  redoStack: GitState[];
  terminalLogs: string[];
  terminalInputHistory: string[];
  terminalInput: string;
  currentLessonId: string; // "sandbox" or lesson.id
  currentStepIndex: number;
  isObjectiveSolved: boolean;
  quizAnsweredIdx: number | null;

  // Settings
  largeFonts: boolean;
  theme: "dark" | "light";

  // Actions
  runCommand: (command: string) => void;
  setTerminalInput: (val: string) => void;
  undo: () => void;
  redo: () => void;
  resetWorkspace: () => void;
  selectLesson: (lessonId: string) => void;
  goToStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // File edits via UI
  createFile: (path: string, content: string) => void;
  editFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  resolveConflictVisually: (
    path: string,
    choice: "ours" | "theirs" | "both",
  ) => void;

  setLargeFonts: (enabled: boolean) => void;
  toggleTheme: () => void;
  answerQuiz: (answerIdx: number) => void;
}

const cloneState = (state: GitState): GitState => {
  return JSON.parse(JSON.stringify(state)) as GitState;
};

export const useGitStore = create<GitStore>((set, get) => {
  // Validate if objective is met
  const checkObjective = (
    state: GitState,
    lessonId: string,
    stepIdx: number,
  ): boolean => {
    if (lessonId === "sandbox") return false;
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return false;
    const step = lesson.steps[stepIdx];
    if (!step || !step.objective) return false;
    try {
      return step.objective.validate(state);
    } catch {
      return false;
    }
  };

  return {
    gitState: createInitialState(),
    historyStack: [],
    redoStack: [],
    terminalLogs: [
      "Welcome to the GitControl Sandbox!",
      "Type 'git init' or select a lesson above to get started.",
      "",
    ],
    terminalInputHistory: [],
    terminalInput: "",
    currentLessonId: "sandbox",
    currentStepIndex: 0,
    isObjectiveSolved: false,
    quizAnsweredIdx: null,

    largeFonts: false,
    theme: "light", // default theme (will be hydrated in page client-side)

    runCommand: (command) => {
      const {
        gitState,
        historyStack,
        currentLessonId,
        currentStepIndex,
        terminalInputHistory,
      } = get();

      // Keep track of original state for undo
      const originalStateClone = cloneState(gitState);

      // Split chained commands by '&&'
      const subCommands = command.split("&&").map((cmd) => cmd.trim());

      let currentGitState = gitState;
      let nextLogs = [...get().terminalLogs];
      nextLogs.push(`$ ${command}`);

      for (const subCmd of subCommands) {
        if (!subCmd) continue;

        let nextState = currentGitState;
        let output: string[] = [];
        let error: boolean | undefined = false;
        try {
          ({ nextState, output, error } = executeGitCommand(
            subCmd,
            currentGitState,
          ));
        } catch (err) {
          // A bug in the engine shouldn't silently swallow the command or
          // crash the terminal — surface it and leave state untouched, same
          // as a real shell reporting a failure and staying put.
          console.error("GitControl engine error for command:", subCmd, err);
          output = [
            `error: internal simulator error while running '${subCmd}'`,
            err instanceof Error ? err.message : String(err),
          ];
          error = true;
        }
        currentGitState = nextState;

        if (output.includes("__CLEAR__")) {
          nextLogs = [];
        } else {
          output.forEach((line) => {
            if (line !== "__CLEAR__") nextLogs.push(line);
          });
        }

        if (error) {
          break; // Stop execution on error, matching real shell && logic
        }
      }

      const solved = checkObjective(
        currentGitState,
        currentLessonId,
        currentStepIndex,
      );

      // Add to input history if not empty
      const nextInputHistory = [...terminalInputHistory];
      if (command.trim()) {
        nextInputHistory.push(command);
      }

      set({
        gitState: currentGitState,
        historyStack: [...historyStack, originalStateClone],
        redoStack: [], // clear redo
        terminalLogs: nextLogs,
        terminalInputHistory: nextInputHistory,
        isObjectiveSolved: solved,
        terminalInput: "", // Clear input on run
      });
    },

    setTerminalInput: (val) => {
      set({ terminalInput: val });
    },

    undo: () => {
      const {
        historyStack,
        gitState,
        redoStack,
        currentLessonId,
        currentStepIndex,
      } = get();
      if (historyStack.length === 0) return;

      const previousState = historyStack[historyStack.length - 1]!;
      const nextHistory = historyStack.slice(0, -1);

      const solved = checkObjective(
        previousState,
        currentLessonId,
        currentStepIndex,
      );

      set({
        gitState: previousState,
        historyStack: nextHistory,
        redoStack: [...redoStack, cloneState(gitState)],
        isObjectiveSolved: solved,
        terminalLogs: [...get().terminalLogs, "Undo last action"],
      });
    },

    redo: () => {
      const {
        redoStack,
        gitState,
        historyStack,
        currentLessonId,
        currentStepIndex,
      } = get();
      if (redoStack.length === 0) return;

      const nextState = redoStack[redoStack.length - 1]!;
      const nextRedo = redoStack.slice(0, -1);

      const solved = checkObjective(
        nextState,
        currentLessonId,
        currentStepIndex,
      );

      set({
        gitState: nextState,
        redoStack: nextRedo,
        historyStack: [...historyStack, cloneState(gitState)],
        isObjectiveSolved: solved,
        terminalLogs: [...get().terminalLogs, "Redo last action"],
      });
    },

    resetWorkspace: () => {
      set({
        gitState: createInitialState(),
        historyStack: [],
        redoStack: [],
        terminalLogs: [
          "Workspace reset.",
          "Type 'git init' or select a lesson to begin.",
          "",
        ],
        isObjectiveSolved: false,
        quizAnsweredIdx: null,
      });
    },

    selectLesson: (lessonId) => {
      const initialRepo = createInitialState();

      if (lessonId === "basics") {
        // Basics starts with empty directory to teach creation/staging from scratch
        initialRepo.workingDirectory = {};
      } else if (
        lessonId === "branching" ||
        lessonId === "merging" ||
        lessonId === "rebase" ||
        lessonId === "recovery" ||
        lessonId === "stash"
      ) {
        // Pre-initialize and create an initial commit to save time
        initialRepo.initialized = true;
        initialRepo.currentBranch = "main";
        initialRepo.HEAD = "main";
        initialRepo.branches = {
          main: { name: "main", commitId: "init-c" },
        };
        initialRepo.commits = {
          "init-c": {
            id: "init-c",
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
        // sync WD files state
        if (initialRepo.workingDirectory["README.md"]) {
          initialRepo.workingDirectory["README.md"].state = "committed";
        }
        if (initialRepo.workingDirectory["index.js"]) {
          initialRepo.workingDirectory["index.js"].state = "committed";
        }
        // sync staging area cache
        initialRepo.stagingArea = { ...initialRepo.commits["init-c"]?.files };
      }

      set({
        gitState: initialRepo,
        historyStack: [],
        redoStack: [],
        currentLessonId: lessonId,
        currentStepIndex: 0,
        isObjectiveSolved: false,
        quizAnsweredIdx: null,
        terminalLogs: [
          `Starting lesson: ${lessonId === "sandbox" ? "Free Play Sandbox" : lessons.find((l) => l.id === lessonId)?.title || ""}`,
          "Good luck!",
          "",
        ],
        terminalInput: "",
      });
    },

    goToStep: (index) => {
      const { currentLessonId, gitState } = get();
      const solved = checkObjective(gitState, currentLessonId, index);

      set({
        currentStepIndex: index,
        isObjectiveSolved: solved,
        quizAnsweredIdx: null,
      });
    },

    nextStep: () => {
      const { currentLessonId, currentStepIndex, gitState, selectLesson } =
        get();
      if (currentLessonId === "sandbox") return;

      const lesson = lessons.find((l) => l.id === currentLessonId);
      if (!lesson) return;

      if (currentStepIndex >= lesson.steps.length - 1) {
        // Last step, load next lesson or sandbox
        const lessonIdx = lessons.findIndex((l) => l.id === currentLessonId);
        if (lessonIdx !== -1 && lessonIdx < lessons.length - 1) {
          const nextLesson = lessons[lessonIdx + 1]!;
          selectLesson(nextLesson.id);
        } else {
          selectLesson("sandbox");
        }
        return;
      }

      const nextIndex = currentStepIndex + 1;
      const solved = checkObjective(gitState, currentLessonId, nextIndex);

      set({
        currentStepIndex: nextIndex,
        isObjectiveSolved: solved,
        quizAnsweredIdx: null,
      });
    },

    prevStep: () => {
      const { currentLessonId, currentStepIndex, gitState } = get();
      if (currentLessonId === "sandbox" || currentStepIndex === 0) return;

      const prevIndex = currentStepIndex - 1;
      const solved = checkObjective(gitState, currentLessonId, prevIndex);

      set({
        currentStepIndex: prevIndex,
        isObjectiveSolved: solved,
        quizAnsweredIdx: null,
      });
    },

    createFile: (path, content) => {
      const { gitState, historyStack, currentLessonId, currentStepIndex } =
        get();
      const originalState = cloneState(gitState);

      const nextWD = { ...gitState.workingDirectory };
      nextWD[path] = {
        path,
        state: "untracked",
        content,
      };

      const nextState = { ...gitState, workingDirectory: nextWD };
      const solved = checkObjective(
        nextState,
        currentLessonId,
        currentStepIndex,
      );

      set({
        gitState: nextState,
        historyStack: [...historyStack, originalState],
        redoStack: [],
        isObjectiveSolved: solved,
        terminalLogs: [...get().terminalLogs, `Created file: ${path}`],
      });
    },

    editFile: (path, content) => {
      const { gitState, historyStack, currentLessonId, currentStepIndex } =
        get();
      const originalState = cloneState(gitState);

      const nextWD = { ...gitState.workingDirectory };
      const existing = nextWD[path];

      // If file was committed or staged, editing shifts state to modified
      let fileState: FileState = "untracked";
      if (existing) {
        fileState =
          (
            existing.state === "committed" ||
            existing.state === "staged" ||
            existing.state === "modified"
          ) ?
            "modified"
          : "untracked";
      }

      nextWD[path] = {
        path,
        state: fileState,
        content,
      };

      const nextState = { ...gitState, workingDirectory: nextWD };
      const solved = checkObjective(
        nextState,
        currentLessonId,
        currentStepIndex,
      );

      set({
        gitState: nextState,
        historyStack: [...historyStack, originalState],
        redoStack: [],
        isObjectiveSolved: solved,
        terminalLogs: [...get().terminalLogs, `Edited file: ${path}`],
      });
    },

    deleteFile: (path) => {
      const { gitState, historyStack } = get();
      const originalState = cloneState(gitState);
      const nextWD = { ...gitState.workingDirectory };

      delete nextWD[path];

      const nextState = { ...gitState, workingDirectory: nextWD };
      const solved = checkObjective(
        nextState,
        get().currentLessonId,
        get().currentStepIndex,
      );

      set({
        gitState: nextState,
        historyStack: [...historyStack, originalState],
        redoStack: [],
        isObjectiveSolved: solved,
        terminalLogs: [...get().terminalLogs, `Deleted file: ${path}`],
      });
    },

    resolveConflictVisually: (path, choice) => {
      const { gitState, historyStack, currentLessonId, currentStepIndex } =
        get();
      const originalState = cloneState(gitState);
      const file = gitState.workingDirectory[path];
      if (!file) return;

      // Extract parts from conflict marker
      // <<<<<<< HEAD
      // ours
      // =======
      // theirs
      // >>>>>>> branch
      const regex = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*/;
      const match = file.content.match(regex);
      if (!match) return;

      const ours = match[1] || "";
      const theirs = match[2] || "";

      let resolvedContent = "";
      if (choice === "ours") {
        resolvedContent = ours;
      } else if (choice === "theirs") {
        resolvedContent = theirs;
      } else {
        resolvedContent = ours + "\n" + theirs;
      }

      const nextWD = { ...gitState.workingDirectory };
      nextWD[path] = {
        path,
        state: "modified",
        content: resolvedContent,
      };

      const nextState = { ...gitState, workingDirectory: nextWD };
      const solved = checkObjective(
        nextState,
        currentLessonId,
        currentStepIndex,
      );

      set({
        gitState: nextState,
        historyStack: [...historyStack, originalState],
        redoStack: [],
        isObjectiveSolved: solved,
        terminalLogs: [
          ...get().terminalLogs,
          `Resolved conflict in ${path} using ${choice}`,
        ],
      });
    },

    setLargeFonts: (enabled) => {
      set({ largeFonts: enabled });
    },

    toggleTheme: () => {
      const nextTheme = get().theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", nextTheme);
      }
      set({ theme: nextTheme });
    },

    answerQuiz: (answerIdx) => {
      const { currentLessonId, currentStepIndex } = get();
      const lesson = lessons.find((l) => l.id === currentLessonId);
      if (!lesson) return;

      const step = lesson.steps[currentStepIndex];
      if (!step || !step.quiz) return;

      const isCorrect = step.quiz.answerIdx === answerIdx;

      set({
        quizAnsweredIdx: answerIdx,
        isObjectiveSolved: isCorrect,
      });
    },
  };
});
