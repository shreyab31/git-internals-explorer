import { useState } from "react";
import type { Commit, DiffEntry } from "../types/git";

type CommitDetailsProps = {
  commit: Commit | null;
  diffs: DiffEntry[];
};

function DiffPatch({ patch }: { patch: string | null }) {
  if (!patch) {
    return (
      <div className="diff-patch-unavailable">
        Patch unavailable for this file.
      </div>
    );
  }

  let oldLine = 0;
  let newLine = 0;

  return (
    <div className="diff-patch">
      <div className="diff-gutter-header">
        <span />
        <span>OLD</span>
        <span>NEW</span>
        <span />
      </div>

      {patch.split("\n").map((line, index) => {
        /*
         * Git hunk header:
         * @@ -oldStart,oldCount +newStart,newCount @@
         */
        if (line.startsWith("@@")) {
          const match = line.match(
            /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/
          );

          if (match) {
            oldLine = Number(match[1]);
            newLine = Number(match[2]);
          }

          return (
            <div
              key={`${index}-${line}`}
              className="diff-line diff-line-header"
            >
              <span className="diff-line-marker" />
              <span className="diff-line-number" />
              <span className="diff-line-number" />
              <span className="diff-line-content">
                {line || " "}
              </span>
            </div>
          );
        }

        /*
         * Git sometimes includes this special line:
         * \ No newline at end of file
         *
         * It is metadata, not an actual added/deleted/context line.
         */
        if (line.startsWith("\\ No newline")) {
          return (
            <div
              key={`${index}-${line}`}
              className="diff-line diff-line-meta"
            >
              <span className="diff-line-marker" />
              <span className="diff-line-number" />
              <span className="diff-line-number" />
              <span className="diff-line-content">
                {line}
              </span>
            </div>
          );
        }

        const isAddition =
          line.startsWith("+") &&
          !line.startsWith("+++");

        const isDeletion =
          line.startsWith("-") &&
          !line.startsWith("---");

        const isHeader =
          line.startsWith("diff ") ||
          line.startsWith("index ") ||
          line.startsWith("---") ||
          line.startsWith("+++");

        const isContext =
          !isAddition &&
          !isDeletion &&
          !isHeader;

        let className = "diff-line";

        if (isAddition) {
          className += " diff-line-addition";
        } else if (isDeletion) {
          className += " diff-line-deletion";
        } else if (isHeader) {
          className += " diff-line-meta";
        } else if (isContext) {
          className += " diff-line-context";
        }

        const displayedOldLine =
          isAddition ? "" : oldLine;

        const displayedNewLine =
          isDeletion ? "" : newLine;

        const marker =
          isAddition
            ? "+"
            : isDeletion
              ? "-"
              : " ";

        const content =
          line || " ";

        /*
         * Update line counters AFTER determining
         * which numbers belong to this row.
         */
        if (isAddition) {
          newLine++;
        } else if (isDeletion) {
          oldLine++;
        } else if (isContext) {
          oldLine++;
          newLine++;
        }

        return (
          <div
            key={`${index}-${line}`}
            className={className}
          >
            <span className="diff-line-marker">
              {marker}
            </span>

            <span className="diff-line-number">
              {displayedOldLine}
            </span>

            <span className="diff-line-number">
              {displayedNewLine}
            </span>

            <span className="diff-line-content">
              {content}
            </span>
          </div>
        );
      })}
    </div>
  );
}
function DiffFile({ diff }: { diff: DiffEntry }) {
  const [expanded, setExpanded] = useState(false);

  const filePath =
    diff.changeType === "DELETED"
      ? diff.oldPath
      : diff.newPath;

  return (
    <div className="diff-file">
      <button
        type="button"
        className="diff-item"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <div className="file-info">
          <span className="diff-expand-icon">
            {expanded ? "▾" : "▸"}
          </span>

          <span className="change-type">
            {diff.changeType}
          </span>

          <code>{filePath}</code>
        </div>

        <div className="file-stats">
          <span className="addition-total">
            +{diff.additions}
          </span>

          <span className="deletion-total">
            -{diff.deletions}
          </span>
        </div>
      </button>

      {expanded && (
        <DiffPatch patch={diff.patch} />
      )}
    </div>
  );
}

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
            Choose a commit from the history to inspect
            what changed.
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
          <span className="summary-label">
            Commit
          </span>

          <h2>{commit.message}</h2>

          <div className="commit-header-meta">
            <code>{commit.id}</code>

            <span>{commit.author}</span>

            <span>
              {new Date(
                commit.authoredAt
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="changes-section">
        <div className="changes-header">
          <div>
            <span className="summary-label">
              Commit diff
            </span>

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
            <DiffFile
              key={`${diff.oldPath}-${diff.newPath}`}
              diff={diff}
            />
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