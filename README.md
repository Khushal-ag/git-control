<div align=center>

# GitControl

**An interactive Git simulator that visualizes branches, commits, merges, and more, live in your browser.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)](https://www.typescriptlang.org/)

</div>

GitControl is a hands-on learning playground for Git. Run real Git commands in a simulated terminal and instantly see how they affect the commit graph, working directory, staging area, stash, and reflog.

## Features

- **Simulated Git terminal**: `init`, `status`, `add`, `commit`, `branch`, `checkout`/`switch`, `merge`, `rebase`, `cherry-pick`, `stash`, `reset`, `revert`, `reflog`, `log`, plus shell helpers (`echo`, `cat`, `ls`, `touch`, `rm`)
- **Visual commit graph**: interactive SVG DAG with branch labels, HEAD indicator, and click actions
- **Three-lane file workspace**: Working Directory → Staging Area → Committed
- **Guided lessons**: 6 structured courses from Git basics through stash & recovery
- **Merge conflict UI**: side-by-side ours/theirs resolution
- **Undo / redo**: full state history with keyboard shortcuts
- **Dark mode**: persisted theme preference

## Getting Started

**Prerequisites:** Node.js ≥ 20.20.2 (or use [Bun](https://bun.sh/))

```bash
git clone https://github.com/Khushal-ag/git-control.git
cd git-control
bun i
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script        | Description                        |
| ------------- | ---------------------------------- |
| `dev`         | Start dev server (Turbopack)       |
| `build`       | Production build                   |
| `start`       | Serve production build             |
| `test`        | Run unit tests (Vitest)            |
| `test:watch`  | Run tests in watch mode            |
| `lint`        | ESLint + TypeScript type-check     |
| `type-check`  | TypeScript type-check only         |
| `fmt`         | Format with Prettier               |
| `validate`    | lint + fmt:check + build (for CI)  |

## Project Structure

```
src/
├── app/              # Next.js App Router (page, layout, metadata)
├── components/
│   ├── layout/       # Navbar
│   └── workspace/    # CommitGraph, FileExplorer, GitTerminal, LessonPanel, ConflictResolver
├── config/           # Site config (SEO, links)
├── lib/
│   ├── git-engine.ts # Pure Git simulator (command → state)
│   └── lessons.ts    # Lesson definitions & objective validators
├── store/
│   └── git-store.ts  # Zustand store (terminal, undo, lesson progress)
└── types/
    └── git.ts        # GitState, GitCommit, GitFile, etc.
```

## Architecture

The app follows a simple unidirectional flow:

1. **UI** (terminal, graph, file explorer) dispatches actions to the **Zustand store**
2. The store calls **`executeGitCommand()`** in `git-engine.ts`, a pure function that returns `{ nextState, output }`
3. Updated state drives all visual panels reactively

The git engine is intentionally isolated and covered by unit tests in `src/lib/git-engine.test.ts`.

## Lessons

| # | Lesson              | Topics                                      |
|---|---------------------|---------------------------------------------|
| 1 | The Git Basics      | init, stage, commit, 3-stage model quiz    |
| 2 | Branching           | branches, checkout, detached HEAD           |
| 3 | Merging & Conflicts | fast-forward, 3-way merge, conflict resolve |
| 4 | Rebase & Cherry-Pick| rebase, cherry-pick                         |
| 5 | Recovery & Undoing  | revert, reset, reflog                       |
| 6 | Shelving with Stash | stash, pop                                  |

Select **Free Play Sandbox** from the navbar to experiment without guidance.

## Customization

Edit **`src/config/site.ts`** for site name, description, URL, and social links. Set **`NEXT_PUBLIC_SITE_URL`** in `.env` to override the canonical URL per environment.

## Tech Stack

- Next.js 16 (App Router, Turbopack, React Compiler)
- React 19
- Zustand 5
- Tailwind CSS v4
- Framer Motion
- TypeScript (strict)
- Vitest (unit tests)
- ESLint 10 + Prettier + Husky

## License

MIT. See [LICENSE](LICENSE).
