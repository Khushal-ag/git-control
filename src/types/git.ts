export type FileState = "untracked" | "modified" | "staged" | "committed";

export interface GitFile {
  path: string;
  state: FileState;
  content: string;
}

export interface GitCommit {
  id: string; // 7-character short hash
  parentIds: string[];
  message: string;
  author: string;
  timestamp: number;
  files: Record<string, string>; // path -> content snapshot
}

export interface GitBranch {
  name: string;
  commitId: string;
}

export interface GitReflogEntry {
  id: string;
  action: string; // e.g., "commit: Initial commit" or "checkout: moving from main to feature"
  previousHead: string | null;
  nextHead: string; // commit hash or branch name
  timestamp: number;
}

export interface StashEntry {
  id: string;
  workingDirectory: Record<string, GitFile>;
  stagingArea: Record<string, string>;
  message: string;
  timestamp: number;
}

export interface GitState {
  initialized: boolean;
  commits: Record<string, GitCommit>;
  branches: Record<string, GitBranch>;
  currentBranch: string | null; // name of current active branch (or null if detached)
  HEAD: string; // branch name or direct commit hash (if detached)
  workingDirectory: Record<string, GitFile>;
  stagingArea: Record<string, string>; // path -> content staged
  stash: StashEntry[];
  reflog: GitReflogEntry[];
}
