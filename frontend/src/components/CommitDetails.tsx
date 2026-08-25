import type { Commit, DiffEntry } from "../types/git";

type CommitDetailsProps = {
  commit: Commit | null;
  diffs: DiffEntry[];
};

export function CommitDetails({
  commit,
  diffs,
}: CommitDetailsProps) {
  if (!commit) {
    return (
      <section className="details-panel">
        <div className="empty-details">
          <div className="empty-icon">◇</div>

          <h2>Select a commit</h2>

          <p>
            Choose a commit from the history to inspect what changed.
          </p>
        </div>
      </section>
    );
  }

  const additions = diffs.reduce(
    (total, diff) => total + diff.additions,
    0
  );

  const deletions = diffs.reduce(
    (total, diff) => total + diff.deletions,
    0
  );

  return (
    <section className="details-panel">
      <div className="commit-header">
        <div>
          <span className="summary-label">Commit</span>

          <h2>{commit.message}</h2>

          <div className="commit-header-meta">
            <code>{commit.id}</code>

            <span>{commit.author}</span>

            <span>
              {new Date(commit.authoredAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="changes-section">
        <div className="changes-header">
          <div>
            <span className="summary-label">Commit diff</span>

            <h3>Changed files</h3>
          </div>

          <div className="change-summary">
            <span className="addition-total">
              +{additions}
            </span>

            <span className="deletion-total">
              -{deletions}
            </span>
          </div>
        </div>

        <div className="diff-list">
          {diffs.map((diff) => (
            <div
              className="diff-item"
              key={`${diff.oldPath}-${diff.newPath}`}
            >
              <div className="file-info">
                <span className="change-type">
                  {diff.changeType}
                </span>

                <code>{diff.newPath}</code>
              </div>

              <div className="file-stats">
                <span className="addition-total">
                  +{diff.additions}
                </span>

                <span className="deletion-total">
                  -{diff.deletions}
                </span>
              </div>
            </div>
          ))}

          {diffs.length === 0 && (
            <p className="empty-state">
              No file changes in this commit.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}