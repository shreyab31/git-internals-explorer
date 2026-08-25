import { useMemo, useState } from "react";
import type { Commit, Ref } from "../types/git";

type BranchGraphProps = {
  commits: Commit[];
  refs: Ref[];
  selectedCommitId: string | null;
  onSelectCommit: (commit: Commit) => void;
};

type GraphNode = {
  commit: Commit;
  lane: number;
  x: number;
  y: number;
  branches: string[];
};

type GraphEdge = {
  from: GraphNode;
  to: GraphNode;
};

function shortId(id: string) {
  return id.slice(0, 7);
}

function buildCommitMap(commits: Commit[]) {
  return new Map(commits.map((commit) => [commit.id, commit]));
}

function getBranchesForCommit(commitId: string, refs: Ref[]) {
  return refs
    .filter(
      (ref) =>
        ref.type === "BRANCH" &&
        ref.target === commitId
    )
    .map((ref) => ref.name);
}

function getRelevantCommits(
  commits: Commit[],
  selectedCommitId: string | null,
  depth = 4
) {
  if (!selectedCommitId) {
    return commits.slice(0, 12);
  }

  const commitMap = buildCommitMap(commits);

  const children = new Map<string, Commit[]>();

  for (const commit of commits) {
    for (const parentId of commit.parentIds) {
      const list = children.get(parentId) ?? [];
      list.push(commit);
      children.set(parentId, list);
    }
  }

  const selected = commitMap.get(selectedCommitId);

  if (!selected) {
    return commits.slice(0, 12);
  }

  const result = new Map<string, Commit>();
  result.set(selected.id, selected);

  // Walk upward through parents.
  let parents = [selected];

  for (let level = 0; level < depth; level++) {
    const next: Commit[] = [];

    for (const commit of parents) {
      for (const parentId of commit.parentIds) {
        const parent = commitMap.get(parentId);

        if (parent && !result.has(parent.id)) {
          result.set(parent.id, parent);
          next.push(parent);
        }
      }
    }

    parents = next;

    if (parents.length === 0) {
      break;
    }
  }

  // Walk downward through children.
  let descendants = [selected];

  for (let level = 0; level < depth; level++) {
    const next: Commit[] = [];

    for (const commit of descendants) {
      for (const child of children.get(commit.id) ?? []) {
        if (!result.has(child.id)) {
          result.set(child.id, child);
          next.push(child);
        }
      }
    }

    descendants = next;

    if (descendants.length === 0) {
      break;
    }
  }

  return Array.from(result.values());
}

/*
 * Topological ordering.
 *
 * A parent MUST appear before its child.
 *
 * This is deliberately not based on authoredAt.
 * Git history is defined by parent relationships.
 */
function topologicalOrder(commits: Commit[]) {
  const commitMap = buildCommitMap(commits);

  const children = new Map<string, Commit[]>();
  const indegree = new Map<string, number>();

  for (const commit of commits) {
    indegree.set(commit.id, 0);
  }

  for (const commit of commits) {
    for (const parentId of commit.parentIds) {
      if (!commitMap.has(parentId)) {
        continue;
      }

      const list = children.get(parentId) ?? [];
      list.push(commit);
      children.set(parentId, list);

      indegree.set(
        commit.id,
        (indegree.get(commit.id) ?? 0) + 1
      );
    }
  }

  /*
   * Start with commits that have no relevant parents.
   * These are the roots of the visible graph.
   */
  const queue = commits
    .filter((commit) => (indegree.get(commit.id) ?? 0) === 0)
    .sort(
      (a, b) =>
        new Date(a.authoredAt).getTime() -
        new Date(b.authoredAt).getTime()
    );

  const ordered: Commit[] = [];

  while (queue.length > 0) {
    const commit = queue.shift()!;

    ordered.push(commit);

    for (const child of children.get(commit.id) ?? []) {
      const nextIndegree =
        (indegree.get(child.id) ?? 0) - 1;

      indegree.set(child.id, nextIndegree);

      if (nextIndegree === 0) {
        queue.push(child);

        queue.sort(
          (a, b) =>
            new Date(a.authoredAt).getTime() -
            new Date(b.authoredAt).getTime()
        );
      }
    }
  }

  /*
   * Normally every commit is included because a Git DAG has no cycles.
   * This fallback protects the UI from malformed/incomplete data.
   */
  if (ordered.length !== commits.length) {
    const alreadyAdded = new Set(
      ordered.map((commit) => commit.id)
    );

    const remaining = commits
      .filter((commit) => !alreadyAdded.has(commit.id))
      .sort(
        (a, b) =>
          new Date(a.authoredAt).getTime() -
          new Date(b.authoredAt).getTime()
      );

    ordered.push(...remaining);
  }

  return ordered;
}

/*
 * Calculate the topological level of every commit.
 *
 * Root:
 *   level = 0
 *
 * Child:
 *   level = max(parent levels) + 1
 *
 * Therefore every parent is guaranteed to have a smaller Y.
 */
export function BranchGraph({
  commits,
  refs,
  selectedCommitId,
  onSelectCommit,
}: BranchGraphProps) {
  const [hoveredCommitId, setHoveredCommitId] =
    useState<string | null>(null);

  const branches = refs.filter(
    (ref) => ref.type === "BRANCH"
  );

  const relevantCommits = useMemo(
    () =>
      getRelevantCommits(
        commits,
        selectedCommitId
      ),
    [commits, selectedCommitId]
  );

  const commitMap = useMemo(
    () => buildCommitMap(commits),
    [commits]
  );

  const graph = useMemo(() => {
    const relevantIds = new Set(
      relevantCommits.map((commit) => commit.id)
    );

    const selected = selectedCommitId
      ? commitMap.get(selectedCommitId)
      : relevantCommits[0];

    if (!selected) {
      return {
        nodes: [] as GraphNode[],
        edges: [] as GraphEdge[],
        width: 900,
        height: 500,
      };
    }

    /*
     * ---------------------------------------------------------
     * TOPOLOGICAL ORDER
     * ---------------------------------------------------------
     *
     * We do NOT use commit dates to decide vertical order.
     * A parent must always appear above its child.
     */

    const children = new Map<string, Commit[]>();
    const indegree = new Map<string, number>();

    for (const commit of relevantCommits) {
      indegree.set(commit.id, 0);
    }

    for (const commit of relevantCommits) {
      for (const parentId of commit.parentIds) {
        if (!relevantIds.has(parentId)) {
          continue;
        }

        const list =
          children.get(parentId) ?? [];

        list.push(commit);
        children.set(parentId, list);

        indegree.set(
          commit.id,
          (indegree.get(commit.id) ?? 0) + 1
        );
      }
    }

    const queue = relevantCommits
      .filter(
        (commit) =>
          (indegree.get(commit.id) ?? 0) === 0
      )
      .sort(
        (a, b) =>
          new Date(a.authoredAt).getTime() -
          new Date(b.authoredAt).getTime()
      );

    const ordered: Commit[] = [];

    while (queue.length > 0) {
      const commit = queue.shift()!;

      ordered.push(commit);

      for (const child of children.get(
        commit.id
      ) ?? []) {
        const next =
          (indegree.get(child.id) ?? 0) - 1;

        indegree.set(
          child.id,
          next
        );

        if (next === 0) {
          queue.push(child);

          queue.sort(
            (a, b) =>
              new Date(
                a.authoredAt
              ).getTime() -
              new Date(
                b.authoredAt
              ).getTime()
          );
        }
      }
    }

    /*
     * ---------------------------------------------------------
     * LANE ASSIGNMENT
     * ---------------------------------------------------------
     *
     * Keep the main history in lane 0.
     *
     * Extra parents of merge commits get temporary
     * side lanes.
     */
    const laneForCommit =
      new Map<string, number>();

    const activeLanes: Array<
      string | null
    > = [];

    const getFreeLane = () => {
      const free =
        activeLanes.findIndex(
          (value) => value === null
        );

      if (free !== -1) {
        return free;
      }

      activeLanes.push(null);
      return activeLanes.length - 1;
    };

    for (
      let i = ordered.length - 1;
      i >= 0;
      i--
    ) {
      const commit = ordered[i];

      /*
       * Find the lane currently carrying this
       * commit's history.
       */
      let lane =
        activeLanes.findIndex(
          (value) =>
            value === commit.id
        );

      /*
       * First/root/main history starts in lane 0.
       */
      if (lane === -1) {
        if (
          activeLanes[0] === null ||
          activeLanes.length === 0
        ) {
          if (
            activeLanes.length === 0
          ) {
            activeLanes.push(null);
          }

          lane = 0;
        } else {
          lane = getFreeLane();
        }
      }

      laneForCommit.set(
        commit.id,
        lane
      );

      const parents =
        commit.parentIds.filter(
          (parentId) =>
            relevantIds.has(parentId)
        );

      /*
       * No parents = root commit.
       */
      if (parents.length === 0) {
        activeLanes[lane] = null;
        continue;
      }

      /*
       * First parent continues this lane.
       */
      activeLanes[lane] =
        parents[0];

      /*
       * Additional parents get side lanes.
       *
       * This is what creates the visual branch
       * coming into a merge.
       */
      for (
        let i = 1;
        i < parents.length;
        i++
      ) {
        const parentId = parents[i];

        const existing =
          activeLanes.findIndex(
            (value) =>
              value === parentId
          );

        if (existing !== -1) {
          continue;
        }

        const sideLane =
          getFreeLane();

        activeLanes[sideLane] =
          parentId;
      }
    }

    /*
     * ---------------------------------------------------------
     * COMPACT LANE NUMBERS
     * ---------------------------------------------------------
     *
     * The previous implementation could leave gaps such as:
     *
     * lane 0
     * lane 1
     * lane 7
     * lane 12
     *
     * That creates huge horizontal distances.
     *
     * Compress them.
     */
    const usedLanes = Array.from(
      new Set(
        Array.from(
          laneForCommit.values()
        )
      )
    ).sort((a, b) => a - b);

    const compactLane =
      new Map<number, number>();

    usedLanes.forEach(
      (lane, index) => {
        compactLane.set(
          lane,
          index
        );
      }
    );

    /*
     * ---------------------------------------------------------
     * Y POSITION
     * ---------------------------------------------------------
     *
     * ordered already guarantees parent -> child.
     *
     * So every row is one level lower.
     */
    const laneWidth = 82;
    const leftPadding = 380;
    const topPadding = 50;
    const verticalGap = 82;

    const nodesById =
      new Map<string, GraphNode>();

    ordered.forEach(
      (commit, index) => {
        const originalLane =
          laneForCommit.get(
            commit.id
          ) ?? 0;

        const lane =
          compactLane.get(
            originalLane
          ) ?? 0;

        const node: GraphNode = {
          commit,
          lane,

          x:
            leftPadding +
            lane * laneWidth,

          y:
            topPadding +
            index * verticalGap,

          branches:
            getBranchesForCommit(
              commit.id,
              refs
            ),
        };

        nodesById.set(
          commit.id,
          node
        );
      }
    );

    const nodes =
      Array.from(
        nodesById.values()
      );

    /*
     * ---------------------------------------------------------
     * EDGES
     * ---------------------------------------------------------
     */
    const edges: GraphEdge[] = [];

    for (const commit of relevantCommits) {
      const child =
        nodesById.get(
          commit.id
        );

      if (!child) {
        continue;
      }

      for (
        const parentId of
        commit.parentIds
      ) {
        if (
          !relevantIds.has(
            parentId
          )
        ) {
          continue;
        }

        const parent =
          nodesById.get(
            parentId
          );

        if (!parent) {
          continue;
        }

        edges.push({
          from: child,
          to: parent,
        });
      }
    }

    /*
     * ---------------------------------------------------------
     * SIZE
     * ---------------------------------------------------------
     */
    const maxLane =
      Math.max(
        ...nodes.map(
          (node) => node.lane
        ),
        0
      );

    const detailCardWidth = 320;
    const detailCardOffset = 390;
    const graphRightPadding = 40;

    const width =
      leftPadding +
      (maxLane + 1) * laneWidth +
      detailCardOffset +
      detailCardWidth +
      graphRightPadding;


    const height =
      topPadding +
      Math.max(
        nodes.length,
        1
      ) *
        verticalGap +
      150;

    return {
      nodes,
      edges,
      width,
      height,
    };
  }, [
    commitMap,
    refs,
    relevantCommits,
    selectedCommitId,
  ]);

  if (commits.length === 0) {
    return (
      <section className="branch-graph">
        <div className="branch-empty">
          <strong>
            No commits found
          </strong>

          <span>
            Open a repository to explore
            its Git history.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="branch-graph">
      <header className="branch-graph-header">
        <div>
          <span className="summary-label">
            Git history
          </span>

          <h2>
            Commit Graph
          </h2>

          <p>
            Parents are above their children.
            Branches and merges are shown as connected lanes.
          </p>
        </div>

        <div className="branch-graph-stats">
          <span>
            <strong>
              {branches.length}
            </strong>
            branches
          </span>

          <span>
            <strong>
              {commits.length}
            </strong>
            commits
          </span>
        </div>
      </header>

      <div className="git-graph-wrapper">
        <div className="git-graph-scroll">
          <div
            className="git-graph-canvas"
            style={{
              minHeight: graph.height,
              width: graph.width,
            }}
          >
          <svg
            className="git-graph-svg"
            viewBox={`0 0 ${graph.width} ${graph.height}`}
            preserveAspectRatio="xMinYMin meet"
            style={{
              width: graph.width,
              height: graph.height,
            }}
          >
            {graph.edges.map((edge, index) => {
              const from = edge.from;
              const to = edge.to;

              const x1 = from.x;
              const y1 = from.y;

              const x2 = to.x;
              const y2 = to.y;

              /*
               * Same lane:
               * simple vertical connection.
               */
              if (from.lane === to.lane) {
                return (
                  <path
                    key={`${from.commit.id}-${to.commit.id}-${index}`}
                    className="git-graph-edge"
                    d={`M ${x1} ${y1} L ${x2} ${y2}`}
                    fill="none"
                  />
                );
              }

              /*
               * Different lanes:
               *
               * Move vertically first,
               * then horizontally,
               * then vertically into the parent.
               *
               * This makes the relationship much easier
               * to follow than a giant diagonal curve.
               */
              const middleY =
                y1 + (y2 - y1) * 0.5;

              const d = `
                M ${x1} ${y1}
                C ${x1} ${middleY},
                  ${x2} ${middleY},
                  ${x2} ${y2}
              `;

              return (
                <path
                  key={`${from.commit.id}-${to.commit.id}-${index}`}
                  className="git-graph-edge"
                  d={d}
                  fill="none"
                />
              );
            })}
          </svg>

          <div
            className="git-graph-nodes"
            style={{
              width:
                graph.width,
              height:
                graph.height,
            }}
          >
            {graph.nodes.map(
              (node) => {
                const commit =
                  node.commit;

                const selected =
                  commit.id ===
                  selectedCommitId;

                const hovered =
                  commit.id ===
                  hoveredCommitId;

                const merge =
                  commit.parentIds
                    .length > 1;

                return (
                  <div
                    key={commit.id}
                    className={[
                      "git-graph-node",
                      selected
                        ? "selected"
                        : "",
                      hovered
                        ? "hovered"
                        : "",
                      merge
                        ? "merge"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                    }}
                  >
                    <button
                      type="button"
                      className="git-graph-dot"
                      onMouseEnter={() =>
                        setHoveredCommitId(
                          commit.id
                        )
                      }
                      onMouseLeave={() =>
                        setHoveredCommitId(
                          null
                        )
                      }
                      onFocus={() =>
                        setHoveredCommitId(
                          commit.id
                        )
                      }
                      onBlur={() =>
                        setHoveredCommitId(
                          null
                        )
                      }
                      onClick={() =>
                        onSelectCommit(
                          commit
                        )
                      }
                      aria-label={`Inspect commit ${shortId(
                        commit.id
                      )}`}
                    >
                      {merge
                        ? "M"
                        : ""}
                    </button>

                    <button
                      type="button"
                      className="git-graph-node-label"
                      onClick={() =>
                        onSelectCommit(
                          commit
                        )
                      }
                    >
                      <span className="git-graph-node-message">
                        {commit.message}
                      </span>

                      <code>
                        {shortId(
                          commit.id
                        )}
                      </code>
                    </button>

                    {node.branches
                      .length > 0 && (
                      <div
                        style={{
                          display:
                            "flex",
                          gap:
                            "0.3rem",
                          position:
                            "absolute",
                          left:
                            "28px",
                          top:
                            "calc(50% + 24px)",
                        }}
                      >
                        {node.branches.map(
                          (branch) => (
                            <span
                              key={
                                branch
                              }
                              className={[
                                "git-graph-node-branch",
                                branch ===
                                "main"
                                  ? "main"
                                  : "",
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " "
                                )}
                            >
                              ⎇{" "}
                              {
                                branch
                              }
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {hovered &&
                      !selected && (
                        <div className="git-commit-hover-card">
                          <span>
                            {
                              commit.message
                            }
                          </span>

                          <code>
                            {
                              commit.id
                            }
                          </code>

                          <small>
                            {new Date(
                              commit.authoredAt
                            ).toLocaleString()}
                          </small>
                        </div>
                    )}
                                {selected && (
                                  <div
                                    className={[
                                      "git-commit-detail-card",
                                      node.lane === 0
                                        ? "git-commit-detail-card-left"
                                        : "git-commit-detail-card-right",
                                    ].join(" ")}
                                  >
                                    <div className="git-commit-detail-top">
                                      <span className="summary-label">
                                        Commit
                                      </span>

                                      <span className="git-selected-type">
                                        {merge ? "MERGE" : "COMMIT"}
                                      </span>
                                    </div>

                                    <h3>
                                      {commit.message}
                                    </h3>

                                    <code className="git-detail-sha">
                                      {commit.id}
                                    </code>

                                    <div className="git-detail-grid">
                                      <div>
                                        <span>Author</span>

                                        <strong>
                                          {commit.author}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>Date</span>

                                        <strong>
                                          {new Date(
                                            commit.authoredAt
                                          ).toLocaleString()}
                                        </strong>
                                      </div>
                                    </div>

                                    <div className="git-detail-parents">
                                      <span>Parents</span>

                                      <div>
                                        {commit.parentIds.length > 0 ? (
                                          commit.parentIds.map((parentId) => (
                                            <code key={parentId}>
                                              {shortId(parentId)}
                                            </code>
                                          ))
                                        ) : (
                                          <code>ROOT</code>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                  </div>
                );
              }
            )}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}