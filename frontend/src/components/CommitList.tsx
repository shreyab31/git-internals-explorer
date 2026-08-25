import type { Commit } from "../types/git";

type CommitListProps = {
  commits: Commit[];
  selectedCommitId: string | null;
  onSelectCommit: (commit: Commit) => void;
};

export function CommitList({
  commits,
  selectedCommitId,
  onSelectCommit,
}: CommitListProps) {
  return (
    <aside className="commit-panel">
      <div className="panel-header">
        <div>
          <span className="summary-label">History</span>
          <h2>Commits</h2>
        </div>

        <span className="count-badge">{commits.length}</span>
      </div>

      <div className="commit-list">
        {commits.map((commit) => (
          <button
            key={commit.id}
            className={`commit-item ${
              selectedCommitId === commit.id ? "selected" : ""
            }`}
            onClick={() => onSelectCommit(commit)}
          >
            <span className="commit-message">
              {commit.message}
            </span>

            <span className="commit-meta">
              <code>{commit.shortId}</code>
              <span>{commit.author}</span>
            </span>

            <span className="commit-date">
              {new Date(commit.authoredAt).toLocaleString()}
            </span>
          </button>
        ))}

        {commits.length === 0 && (
          <p className="empty-state">No commits found.</p>
        )}
      </div>
    </aside>
  );
}