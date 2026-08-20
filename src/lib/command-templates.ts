import type { GitState } from "@/types/git";

export function getRootCommitId(state: GitState): string | null {
  const mainId = state.branches.main?.commitId;
  if (!mainId) return null;
  let curr = mainId;
  while (true) {
    const commit = state.commits[curr];
    if (!commit || commit.parentIds.length === 0) return curr;
    curr = commit.parentIds[0]!;
  }
}

export function findOrphanFeatureCommit(state: GitState): string | null {
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

export function resolveCommandTemplate(cmd: string, state: GitState): string {
  if (!cmd.includes("<")) return cmd;

  let resolved = cmd;

  if (resolved.includes("<bug-commit-hash>")) {
    const headId =
      (state.currentBranch ?
        state.branches[state.currentBranch]?.commitId
      : state.HEAD) || "";
    const headMessage = headId ? state.commits[headId]?.message : undefined;
    if (headId && headMessage === "Introduce a bug") {
      resolved = resolved.replaceAll("<bug-commit-hash>", headId);
    }
  }

  if (resolved.includes("<first-commit-hash>")) {
    const rootId = getRootCommitId(state);
    if (rootId) {
      resolved = resolved.replaceAll("<first-commit-hash>", rootId);
    }
  }

  if (resolved.includes("<commit-hash>")) {
    const orphan = findOrphanFeatureCommit(state);
    if (orphan) {
      resolved = resolved.replaceAll("<commit-hash>", orphan);
    }
  }

  return resolved;
}
