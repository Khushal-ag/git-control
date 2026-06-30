"use client";

import { useEffect } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle,
  Play,
  Target,
} from "lucide-react";

import { lessons } from "@/lib/lessons";
import { useGitStore } from "@/store/git-store";

export function LessonPanel() {
  const {
    currentLessonId,
    currentStepIndex,
    isObjectiveSolved,
    quizAnsweredIdx,
    nextStep,
    prevStep,
    answerQuiz,
    setTerminalInput,
  } = useGitStore();

  // Expose setter globally so that HTML onclick triggers it
  useEffect(() => {
    if (typeof window !== "undefined") {
      (
        window as unknown as { setTerminalInput: (cmd: string) => void }
      ).setTerminalInput = (cmd: string) => {
        setTerminalInput(cmd);
        setTimeout(() => {
          const el = document.getElementById("terminal-input");
          if (el) el.focus();
        }, 50);
      };
    }
  }, [setTerminalInput]);

  if (currentLessonId === "sandbox") {
    return (
      <div className="dark:border-zinc-850 flex h-full flex-col justify-between border-r border-zinc-200 bg-zinc-50 p-6 text-zinc-600 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-300">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-orange-500">
            <Award className="size-5" />
            <h2 className="text-lg font-bold tracking-wider uppercase">
              Free Play Sandbox
            </h2>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <h3 className="mb-3 text-base font-bold text-zinc-800 dark:text-zinc-100">
              Welcome to Sandbox Mode!
            </h3>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              You are in a fully interactive, unguided sandbox. You have full
              freedom to build any Git repository history.
            </p>
            <h4 className="mt-4 mb-2 text-xs font-semibold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
              Suggested actions to try:
            </h4>
            <ul className="list-inside list-disc space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                Type{" "}
                <code
                  onClick={() => setTerminalInput("git init")}
                  className="dark:border-zinc-850 inline-block cursor-pointer rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono whitespace-nowrap text-orange-600 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:bg-zinc-950 dark:text-orange-400 dark:hover:bg-orange-950/20"
                >
                  git init
                </code>{" "}
                to initialize a repository.
              </li>
              <li>
                Create files using the files workspace (+) or the terminal.
              </li>
              <li>
                Stage changes using{" "}
                <code
                  onClick={() => setTerminalInput("git add .")}
                  className="dark:border-zinc-850 inline-block cursor-pointer rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono whitespace-nowrap text-orange-600 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:bg-zinc-950 dark:text-orange-400 dark:hover:bg-orange-950/20"
                >
                  git add .
                </code>
                .
              </li>
              <li>
                Make commits using{" "}
                <code
                  onClick={() =>
                    setTerminalInput('git commit -m "initial commit"')
                  }
                  className="dark:border-zinc-850 inline-block cursor-pointer rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono whitespace-nowrap text-orange-600 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:bg-zinc-950 dark:text-orange-400 dark:hover:bg-orange-950/20"
                >
                  git commit -m "initial commit"
                </code>
                .
              </li>
              <li>
                Create branch paths using{" "}
                <code
                  onClick={() => setTerminalInput("git branch dev")}
                  className="dark:border-zinc-850 inline-block cursor-pointer rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono whitespace-nowrap text-orange-600 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:bg-zinc-950 dark:text-orange-400 dark:hover:bg-orange-950/20"
                >
                  git branch dev
                </code>
                .
              </li>
              <li>Perform merges, rebases, and explore cherry-picks!</li>
            </ul>
          </div>
        </div>

        <div className="dark:text-zinc-550 shadow-xxs rounded-lg border border-zinc-200 bg-white p-4 text-center text-xs text-zinc-500 dark:border-zinc-800/50 dark:bg-zinc-900/20">
          Tip: You can select a structured lesson from the top navigation
          dropdown at any time!
        </div>
      </div>
    );
  }

  const lesson = lessons.find((l) => l.id === currentLessonId);
  if (!lesson) return null;

  const step = lesson.steps[currentStepIndex];
  if (!step) return null;

  const isLastStep = currentStepIndex === lesson.steps.length - 1;

  // Simple parser to render bold, list items, and code highlights
  const renderMarkdown = (text: string) => {
    return text.split("\n\n").map((para, i) => {
      // Check for list items
      if (para.startsWith("- ") || para.startsWith("* ")) {
        return (
          <ul
            key={i}
            className="my-2 list-inside list-disc space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300"
          >
            {para.split("\n").map((line, j) => {
              const cleaned = line.replace(/^[-*]\s+/, "");
              return (
                <li
                  key={j}
                  dangerouslySetInnerHTML={{
                    __html: parseInlineStyles(cleaned),
                  }}
                />
              );
            })}
          </ul>
        );
      }

      // Normal paragraph
      return (
        <p
          key={i}
          className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
          dangerouslySetInnerHTML={{ __html: parseInlineStyles(para) }}
        />
      );
    });
  };

  const parseInlineStyles = (text: string) => {
    return text
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="text-zinc-900 dark:text-zinc-100 font-bold">$1</strong>',
      )
      .replace(
        /`(.*?)`/g,
        '<code onclick="if(window.setTerminalInput) { window.setTerminalInput(\'$1\'); }" class="cursor-pointer hover:bg-orange-55 hover:text-orange-700 dark:hover:bg-orange-950/20 transition-all duration-150 inline-block whitespace-nowrap text-orange-650 dark:text-orange-400 font-mono bg-zinc-100 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-850">$1</code>',
      );
  };

  return (
    <div className="dark:border-zinc-850 flex h-full flex-col justify-between border-r border-zinc-200 bg-zinc-50 p-6 text-zinc-600 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-300">
      {/* Lesson Heading and description */}
      <div className="space-y-5 overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <span className="rounded border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400">
            {lesson.category}
          </span>
          <span className="text-xs font-medium text-zinc-500">
            Step {currentStepIndex + 1} of {lesson.steps.length}
          </span>
        </div>

        <div>
          <h2 className="text-base font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            {lesson.title}
          </h2>
          <h3 className="mt-1 text-xl font-extrabold text-zinc-800 dark:text-white">
            {step.title}
          </h3>
        </div>

        {/* Dynamic step instructions */}
        <div className="space-y-3 pt-2">{renderMarkdown(step.explanation)}</div>

        {/* Objective Box */}
        {step.objective && (
          <div
            className={`mt-5 rounded-xl border p-4 transition-all duration-300 ${
              isObjectiveSolved ?
                "border-emerald-500/30 bg-emerald-50 shadow-md shadow-emerald-500/5 dark:bg-emerald-950/15"
              : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                <Target className="size-4 text-orange-500" />
                <span>Target Objective</span>
              </div>
              {isObjectiveSolved ?
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="size-3.5" /> Solved
                </span>
              : <span className="text-xs font-medium text-amber-500">
                  Pending
                </span>
              }
            </div>
            <p
              className={`text-sm ${isObjectiveSolved ? "text-emerald-700 line-through opacity-85 dark:text-emerald-300" : "text-zinc-800 dark:text-zinc-100"}`}
            >
              {step.objective.description}
            </p>

            {/* Quick pre-fill command */}
            {!isObjectiveSolved && step.commandPreset && (
              <button
                onClick={() => {
                  setTerminalInput(step.commandPreset || "");
                }}
                className="text-zinc-650 mt-3 flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium transition hover:bg-zinc-200 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Play className="size-3 text-orange-500" />
                <span>Autofill Command</span>
              </button>
            )}
          </div>
        )}

        {/* Quiz Box */}
        {step.quiz && (
          <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <h4 className="mb-3 text-sm font-bold text-zinc-800 dark:text-zinc-100">
              {step.quiz.question}
            </h4>
            <div className="space-y-2">
              {step.quiz.options.map((opt, idx) => {
                const isSelected = quizAnsweredIdx === idx;
                const isCorrect = step.quiz!.answerIdx === idx;
                const answered = quizAnsweredIdx !== null;

                let btnStyle =
                  "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 dark:text-zinc-300 cursor-pointer";
                if (answered) {
                  if (isCorrect) {
                    btnStyle =
                      "border-emerald-500/30 bg-emerald-50 text-emerald-600 font-medium dark:bg-emerald-950/25 dark:text-emerald-400";
                  } else if (isSelected) {
                    btnStyle =
                      "border-rose-500/30 bg-rose-50 text-rose-600 dark:bg-rose-950/25 dark:text-rose-400";
                  } else {
                    btnStyle =
                      "border-zinc-100 bg-zinc-50 text-zinc-400 opacity-60 dark:border-zinc-800/60 dark:bg-zinc-900/20 dark:text-zinc-500 cursor-not-allowed";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={answered}
                    onClick={() => answerQuiz(idx)}
                    className={`w-full rounded-lg border p-3 text-left text-xs transition-all duration-150 ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {quizAnsweredIdx !== null && (
              <div className="text-zinc-650 dark:border-zinc-850 mt-4 rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-xs leading-relaxed dark:bg-zinc-950 dark:text-zinc-400">
                <span className="mb-1 block font-bold text-zinc-800 dark:text-zinc-200">
                  {quizAnsweredIdx === step.quiz.answerIdx ?
                    "✓ Correct!"
                  : "✗ Incorrect"}
                </span>
                {step.quiz.explanation}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Footer Navigation */}
      {(() => {
        const isBackDisabled = currentStepIndex === 0;
        const isNextClickable =
          (isObjectiveSolved || step.objective === undefined) && !isLastStep;

        const backBtnClass =
          isBackDisabled ?
            "border border-zinc-200 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600 opacity-40 cursor-not-allowed"
          : "border border-orange-500/20 bg-orange-500/5 text-orange-600 hover:bg-orange-500/10 active:scale-95 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 cursor-pointer";

        const nextBtnClass =
          isNextClickable ?
            isObjectiveSolved ?
              "bg-linear-to-r from-orange-500 to-rose-600 text-white font-bold animate-pulse hover:shadow-lg hover:shadow-orange-500/25 active:scale-95 cursor-pointer"
            : "bg-orange-500 text-white font-bold hover:bg-orange-600 active:scale-95 shadow-md shadow-orange-500/15 cursor-pointer"
          : "border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-600 cursor-not-allowed opacity-50";

        return (
          <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800/80">
            <button
              disabled={isBackDisabled}
              onClick={prevStep}
              className={`flex h-9 items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200 ${backBtnClass}`}
            >
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </button>

            {/* Step progress dots */}
            <div className="flex gap-1.5">
              {lesson.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStepIndex ? "w-4 bg-orange-500"
                    : i < currentStepIndex ? "w-1.5 bg-emerald-500"
                    : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
              ))}
            </div>

            <button
              disabled={!isNextClickable}
              onClick={nextStep}
              className={`flex h-9 items-center gap-1.5 rounded-lg px-4 py-1 text-xs font-semibold transition-all duration-200 ${nextBtnClass}`}
            >
              <span>Next</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        );
      })()}
    </div>
  );
}
