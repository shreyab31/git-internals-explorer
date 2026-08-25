import type { Commit, Ref } from "../types/git";

type BranchHistoryProps = {
    refs: Ref[];
    commits: Commit[];
    selectedCommitId: string | null;
    onSelectCommit: (commit: Commit) => void;
};

function shortId(id: string) {
    return id.slice(0, 7);
}

function getBranchCommits(
    ref: Ref,
    commits: Commit[]
): Commit[] {
    if (!ref.target) {
        return [];
    }

    const commitMap = new Map(
        commits.map((commit) => [commit.id, commit])
    );

    const result: Commit[] = [];
    const visited = new Set<string>();

    let currentId: string | null = ref.target;

    while (currentId && !visited.has(currentId)) {
        visited.add(currentId);

        const commit = commitMap.get(currentId);

        if (!commit) {
            break;
        }

        result.push(commit);

        currentId = commit.parentIds[0] ?? null;
    }

    return result;
}

function isMergeCommit(commit: Commit) {
    return commit.parentIds.length > 1;
}

export function BranchHistory({
    refs,
    commits,
    selectedCommitId,
    onSelectCommit,
}: BranchHistoryProps) {
    const branches = refs.filter(
        (ref) => ref.type === "BRANCH"
    );

    return (
        <section className="branch-history">
            <header className="branch-history-header">
                <div>
                    <span className="summary-label">
                        Repository history
                    </span>

                    <h2>Branches & commits</h2>

                    <p>
                        Explore how branches diverge,
                        develop, and merge.
                    </p>
                </div>

                <div className="branch-history-stats">
                    <span>
                        <strong>{branches.length}</strong>
                        branches
                    </span>

                    <span>
                        <strong>{commits.length}</strong>
                        commits
                    </span>
                </div>
            </header>

            <div className="branch-history-content">
                {branches.map((branch) => {
                    const branchCommits =
                        getBranchCommits(
                            branch,
                            commits
                        );

                    return (
                        <section
                            className="branch-section"
                            key={branch.name}
                        >
                            <div className="branch-header">
                                <div className="branch-title">
                                    <span className="branch-icon">
                                        🌿
                                    </span>

                                    <div>
                                        <strong>
                                            {branch.name}
                                        </strong>

                                        <span>
                                            {branch.target
                                                ? shortId(
                                                      branch.target
                                                  )
                                                : "No target"}
                                        </span>
                                    </div>
                                </div>

                                <span className="branch-count">
                                    {branchCommits.length} commits
                                </span>
                            </div>

                            <div className="branch-commits">
                                {branchCommits.map(
                                    (commit, index) => {
                                        const selected =
                                            selectedCommitId ===
                                            commit.id;

                                        const merge =
                                            isMergeCommit(
                                                commit
                                            );

                                        return (
                                            <button
                                                key={commit.id}
                                                className={[
                                                    "branch-commit",
                                                    selected
                                                        ? "selected"
                                                        : "",
                                                    merge
                                                        ? "merge"
                                                        : "",
                                                ]
                                                    .filter(
                                                        Boolean
                                                    )
                                                    .join(" ")}
                                                onClick={() =>
                                                    onSelectCommit(
                                                        commit
                                                    )
                                                }
                                            >
                                                <span className="commit-rail">
                                                    <span className="commit-line" />

                                                    <span className="commit-dot">
                                                        {merge
                                                            ? "↗"
                                                            : ""}
                                                    </span>

                                                    {index <
                                                        branchCommits.length -
                                                            1 && (
                                                        <span className="commit-line-bottom" />
                                                    )}
                                                </span>

                                                <span className="branch-commit-card">
                                                    <span className="branch-commit-top">
                                                        <span className="branch-commit-message">
                                                            {
                                                                commit.message
                                                            }
                                                        </span>

                                                        {merge && (
                                                            <span className="merge-badge">
                                                                MERGE
                                                            </span>
                                                        )}
                                                    </span>

                                                    <span className="branch-commit-meta">
                                                        <code>
                                                            {
                                                                commit.shortId
                                                            }
                                                        </code>

                                                        <span>
                                                            {
                                                                commit.author
                                                            }
                                                        </span>

                                                        <span>
                                                            {new Date(
                                                                commit.authoredAt
                                                            ).toLocaleString()}
                                                        </span>
                                                    </span>

                                                    {merge && (
                                                        <span className="merge-info">
                                                            {commit.parentIds.length}{" "}
                                                            parent commits
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    }
                                )}

                                {branchCommits.length ===
                                    0 && (
                                    <p className="empty-state">
                                        No commits found for
                                        this branch.
                                    </p>
                                )}
                            </div>
                        </section>
                    );
                })}

                {branches.length === 0 && (
                    <div className="branch-history-empty">
                        <span>🌿</span>

                        <h3>No branches found</h3>

                        <p>
                            Open a Git repository with at
                            least one local branch.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}