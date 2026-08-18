"use client";

import { useEffect, useRef, useState } from "react";

import {
  Eye,
  GitBranch,
  GitPullRequest,
  MousePointerClick,
  RefreshCw,
  Unlink,
} from "lucide-react";

import { useGitStore } from "@/store/git-store";
import { cn } from "@/lib/utils";

// Full literal Tailwind classnames (not derived via string concatenation) so
// the JIT compiler can statically discover and generate them.
const TRACK_DOT_COLORS = [
  "bg-blue-500", // Main (track 0)
  "bg-purple-500", // branch 1
  "bg-emerald-500", // branch 2
  "bg-amber-500", // branch 3
  "bg-pink-500", // branch 4
];

export function CommitGraph() {
  const { gitState, runCommand } = useGitStore();
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setSelectedCommitId(null);
      setMenuPosition(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  if (!gitState.initialized) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-6 text-zinc-500 transition-colors duration-300 dark:border-zinc-900 dark:bg-zinc-950">
        <GitPullRequest className="mb-3 size-10 animate-pulse text-zinc-400 dark:text-zinc-700" />
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-400">
          No Git Repository Initialized
        </h3>
        <p className="mt-1 max-w-xs text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-600">
          Initialize a repository by running{" "}
          <code className="text-zinc-650 rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
            git init
          </code>{" "}
          in the terminal to view the visual commit tree.
        </p>
      </div>
    );
  }

  const commitsList = Object.values(gitState.commits).sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  if (commitsList.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-6 text-zinc-500 transition-colors duration-300 dark:border-zinc-900 dark:bg-zinc-950">
        <GitPullRequest className="mb-3 size-10 text-zinc-400 dark:text-zinc-700" />
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-400">
          Empty Git Repository
        </h3>
        <p className="mt-1 max-w-xs text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-600">
          Your repository is initialized. Write files, stage them, and create
          commits with{" "}
          <code className="text-zinc-650 rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
            git commit
          </code>{" "}
          to start building the graph.
        </p>
      </div>
    );
  }

  // Position generation algorithm
  // Assign columns based on chronological order of commits
  const commitCoords: Record<string, { x: number; y: number; track: number }> =
    {};
  const activeTracks: Record<number, string> = {}; // trackIndex -> lastCommitId on that track

  commitsList.forEach((commit, index) => {
    // 190px gives a branch-name pill + adjacent HEAD badge enough room to
    // clear the next commit's node before it gets drawn.
    const x = index * 190 + 70;
    let assignedTrack = 0;

    // Track determination based on parents
    if (commit.parentIds.length === 0) {
      // Root commit
      assignedTrack = 0;
      activeTracks[0] = commit.id;
    } else {
      const primaryParentId = commit.parentIds[0];
      if (primaryParentId) {
        const parentCoords = commitCoords[primaryParentId];
        if (parentCoords) {
          const parentTrack = parentCoords.track;

          // If parent track is already occupied, check if we can reuse or branch off
          if (activeTracks[parentTrack] === primaryParentId) {
            assignedTrack = parentTrack;
            activeTracks[parentTrack] = commit.id;
          } else {
            // Branching off. Find the next empty track.
            let track = 1;
            while (
              activeTracks[track] !== undefined &&
              activeTracks[track] !== primaryParentId
            ) {
              track++;
            }
            assignedTrack = track;
            activeTracks[track] = commit.id;
          }
        }
      }
    }

    const y = 115 + assignedTrack * 75;
    commitCoords[commit.id] = { x, y, track: assignedTrack };
  });

  // Collect active pointers pointing to each commit
  const commitPointers: Record<string, string[]> = {};

  // Find which commits branches point to
  Object.keys(gitState.branches).forEach((branchName) => {
    const b = gitState.branches[branchName];
    if (b && b.commitId) {
      if (!commitPointers[b.commitId]) commitPointers[b.commitId] = [];
      commitPointers[b.commitId]!.push(branchName);
    }
  });

  // Find HEAD
  let headPointingCommitId = "";
  if (gitState.currentBranch && gitState.branches[gitState.currentBranch]) {
    headPointingCommitId = gitState.branches[gitState.currentBranch]!.commitId;
  } else if (gitState.HEAD && gitState.commits[gitState.HEAD]) {
    headPointingCommitId = gitState.HEAD;
  }

  // Get active branch name
  const activeBranch = gitState.currentBranch;

  // Track colors helper
  const getTrackColor = (track: number): string => {
    const colors = [
      "stroke-blue-500", // Main (track 0)
      "stroke-purple-500", // branch 1
      "stroke-emerald-500", // branch 2
      "stroke-amber-500", // branch 3
      "stroke-pink-500", // branch 4
    ];
    return colors[track % colors.length] || "stroke-blue-500";
  };

  // Node menu click handlers
  const handleNodeClick = (e: React.MouseEvent, commitId: string) => {
    e.stopPropagation();
    setSelectedCommitId(commitId);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuPosition({
        x: e.clientX - rect.left + containerRef.current.scrollLeft,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleCheckout = (commitId: string) => {
    runCommand(`git checkout ${commitId}`);
    setSelectedCommitId(null);
    setMenuPosition(null);
  };

  const handleResetHard = (commitId: string) => {
    runCommand(`git reset --hard ${commitId}`);
    setSelectedCommitId(null);
    setMenuPosition(null);
  };

  const handleCherryPick = (commitId: string) => {
    runCommand(`git cherry-pick ${commitId}`);
    setSelectedCommitId(null);
    setMenuPosition(null);
  };

  const svgWidth = commitsList.length * 190 + 150;
  // Dynamic height based on max track assigned
  const maxTrack = Math.max(
    ...Object.values(commitCoords).map((c) => c.track),
    0,
  );
  const svgHeight = 220 + maxTrack * 75;

  // Legend entries: one dot per branch, colored by the track its tip commit
  // currently occupies, sorted so track 0 (main) always leads.
  const legendBranches = Object.keys(gitState.branches)
    .map((name) => {
      const commitId = gitState.branches[name]?.commitId;
      const track = commitId ? commitCoords[commitId]?.track : undefined;
      return track === undefined ? null : { name, track };
    })
    .filter((entry): entry is { name: string; track: number } => entry !== null)
    .sort((a, b) => a.track - b.track);

  return (
    <div
      ref={containerRef}
      className="relative scrollbar-thin h-full w-full scrollbar-thumb-zinc-200 overflow-auto rounded-xl border border-zinc-200 bg-white transition-colors duration-300 dark:scrollbar-thumb-zinc-800 dark:border-zinc-900 dark:bg-zinc-950"
    >
      {/* Legend panel */}
      <div className="absolute top-3 left-4 z-10 flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-lg border border-zinc-200 bg-zinc-50/95 px-3 py-1.5 text-xxs font-bold text-zinc-500 shadow-xxs backdrop-blur-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-none">
        {legendBranches.map(({ name, track }) => (
          <span key={name} className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                TRACK_DOT_COLORS[track % TRACK_DOT_COLORS.length],
              )}
            />
            {name}
          </span>
        ))}
        <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="flex items-center gap-1.5 font-medium text-zinc-400 dark:text-zinc-500">
          <MousePointerClick className="size-3" />
          Click a commit node to explore actions
        </span>
      </div>

      <svg width={svgWidth} height={svgHeight} className="min-w-full">
        {/* Draw connection lines */}
        {commitsList.map((commit) => {
          const childCoords = commitCoords[commit.id];
          if (!childCoords) return null;

          return commit.parentIds.map((parentId) => {
            const parentCoords = commitCoords[parentId];
            if (!parentCoords) return null;

            // Draw clean curved Bezier connections
            const pathData = `
              M ${parentCoords.x} ${parentCoords.y}
              C ${(parentCoords.x + childCoords.x) / 2} ${parentCoords.y},
                ${(parentCoords.x + childCoords.x) / 2} ${childCoords.y},
                ${childCoords.x} ${childCoords.y}
            `;

            return (
              <path
                key={`${parentId}-${commit.id}`}
                d={pathData}
                fill="none"
                className={`stroke-2 opacity-60 transition-all duration-300 ${getTrackColor(parentCoords.track)}`}
              />
            );
          });
        })}

        {/* Draw commit nodes */}
        {commitsList.map((commit) => {
          const coords = commitCoords[commit.id];
          if (!coords) return null;

          const isCurrentHead = commit.id === headPointingCommitId;
          const isMerge = commit.parentIds.length > 1;

          return (
            <g key={commit.id} className="cursor-pointer">
              {/* Outer glow ring for HEAD */}
              {isCurrentHead && (
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r="18"
                  style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                  className="animate-ping fill-none stroke-emerald-400 stroke-2 opacity-25"
                />
              )}
              {isCurrentHead && (
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r="14"
                  className="fill-none stroke-emerald-400/80 stroke-2"
                />
              )}

              {/* Node circle */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r="10"
                style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                onClick={(e) => handleNodeClick(e, commit.id)}
                className={`cursor-pointer stroke-2 transition-all duration-200 hover:scale-125 hover:stroke-zinc-800 dark:hover:stroke-zinc-200 ${
                  isCurrentHead ?
                    "fill-emerald-100 stroke-emerald-500 dark:fill-emerald-950 dark:stroke-emerald-400"
                  : isMerge ? "fill-rose-50 stroke-rose-500 dark:fill-zinc-950"
                  : `fill-zinc-50 dark:fill-zinc-900 ${getTrackColor(coords.track)}`
                }`}
              />

              {/* Node hash abbreviation */}
              <text
                x={coords.x}
                y={coords.y + 25}
                textAnchor="middle"
                className="fill-zinc-500 font-mono text-xxxxs font-semibold dark:fill-zinc-400"
                onClick={(e) => handleNodeClick(e, commit.id)}
              >
                {commit.id.substring(0, 7)}
              </text>

              {/* Node short message tooltip on node */}
              <title>
                {`Hash: ${commit.id}\nMsg: ${commit.message}\nAuthor: ${commit.author}\nDate: ${new Date(
                  commit.timestamp,
                ).toLocaleString()}`}
              </title>
            </g>
          );
        })}

        {/* Draw pointer labels (branches / HEAD) as real HTML pills, so
            width/spacing is handled by flexbox instead of a hand-estimated
            "chars * px" formula that drifted out of sync with the text. */}
        {commitsList.map((commit) => {
          const coords = commitCoords[commit.id];
          if (!coords) return null;

          const pointers = commitPointers[commit.id] || [];
          const isHeadDirect =
            gitState.HEAD === commit.id && !gitState.currentBranch;

          if (pointers.length === 0 && !isHeadDirect) return null;

          const ROW_HEIGHT = 30;
          const ROW_GAP = 8;
          const labelX = coords.x + 30;

          return (
            <g key={`ptr-${commit.id}`} className="select-none">
              {pointers.map((bName, pIdx) => {
                const rowTop =
                  coords.y - 15 - pIdx * (ROW_HEIGHT + ROW_GAP);
                const anchorY = rowTop + ROW_HEIGHT / 2;
                const isBranchHeadActive = bName === activeBranch;

                return (
                  <g key={bName}>
                    {/* Connector from node edge to the pill's left edge */}
                    <path
                      d={`M ${coords.x + 7} ${coords.y - 7} C ${coords.x + 20} ${coords.y - 7}, ${coords.x + 20} ${anchorY}, ${labelX} ${anchorY}`}
                      strokeDasharray="1 4"
                      strokeLinecap="round"
                      fill="none"
                      className="stroke-zinc-300 stroke-[1.5] transition-all duration-300 dark:stroke-zinc-700"
                    />

                    <foreignObject
                      x={labelX}
                      y={rowTop}
                      width={260}
                      height={ROW_HEIGHT}
                      overflow="visible"
                    >
                      <div
                        style={{ width: "max-content" }}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xxs font-bold whitespace-nowrap shadow-sm backdrop-blur-xs transition-colors duration-300",
                            isBranchHeadActive ?
                              "border-emerald-500/40 bg-emerald-50/90 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-950/90 dark:text-emerald-400"
                            : "border-zinc-200 bg-zinc-50/90 text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/90 dark:text-zinc-400",
                          )}
                        >
                          <GitBranch className="size-3 shrink-0" />
                          <span>{bName}</span>
                        </div>

                        {isBranchHeadActive && (
                          <div className="rounded-full border border-orange-400/40 bg-orange-50/90 px-2.5 py-1 text-xxs font-extrabold whitespace-nowrap text-orange-600 shadow-sm dark:border-orange-500/50 dark:bg-orange-950/90 dark:text-orange-400">
                            HEAD
                          </div>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}

              {/* Detached HEAD direct tag */}
              {isHeadDirect && (
                <g>
                  <path
                    d={`M ${coords.x + 7} ${coords.y - 7} C ${coords.x + 20} ${coords.y - 7}, ${coords.x + 20} ${coords.y - 15}, ${labelX} ${coords.y - 15}`}
                    strokeDasharray="1 4"
                    strokeLinecap="round"
                    fill="none"
                    className="stroke-zinc-300 stroke-[1.5] transition-all duration-300 dark:stroke-zinc-700"
                  />
                  <foreignObject
                    x={labelX}
                    y={coords.y - 15 - ROW_HEIGHT / 2}
                    width={200}
                    height={ROW_HEIGHT}
                    overflow="visible"
                  >
                    <div
                      style={{ width: "max-content" }}
                      className="flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-50/90 px-2.5 py-1 text-xxs font-bold whitespace-nowrap text-rose-600 shadow-sm dark:border-rose-500/50 dark:bg-rose-950/90 dark:text-rose-400"
                    >
                      <Unlink className="size-3 shrink-0" />
                      <span>HEAD (detached)</span>
                    </div>
                  </foreignObject>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Action Menu for Clicked Node */}
      {selectedCommitId && menuPosition && (
        <div
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y + 12}px`,
          }}
          className="absolute z-40 w-44 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl backdrop-blur-xs dark:border-zinc-800 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 border-b border-zinc-200 px-2 py-1 font-mono text-[10px] font-bold text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
            COMMIT {selectedCommitId.substring(0, 7)}
          </div>
          <button
            onClick={() => handleCheckout(selectedCommitId)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xxs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <Eye className="size-3 text-emerald-500 dark:text-emerald-400" />
            <span>git checkout</span>
          </button>
          <button
            onClick={() => handleResetHard(selectedCommitId)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xxs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <RefreshCw className="size-3 text-orange-500 dark:text-orange-400" />
            <span>git reset --hard</span>
          </button>
          <button
            onClick={() => handleCherryPick(selectedCommitId)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xxs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <GitPullRequest className="size-3 text-purple-500 dark:text-purple-400" />
            <span>git cherry-pick</span>
          </button>
        </div>
      )}
    </div>
  );
}
