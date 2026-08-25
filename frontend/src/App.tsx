import { useState } from "react";

import { CommitDetails } from "./components/CommitDetails";
import { RepositoryBar } from "./components/RepositoryBar";
import { ObjectInspector } from "./components/ObjectInspector";
import { Navigation } from "./components/Navigation";
import { BranchGraph } from "./components/BranchGraph";
import type { Commit, DiffEntry, Ref, RepositoryInfo } from "./types/git";
import type { ObjectGraph } from "./api/repositoryApi";

import {
  getCommitDiff,
  getCommits,
  getRefs,
  getObjectGraph,
  openRepository as openRepositoryApi,
} from "./api/repositoryApi";

type Page = "repository" | "commits" | "objects";

export function App() {
  const [path, setPath] = useState("");

  const [repository, setRepository] =
    useState<RepositoryInfo | null>(null);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [refs, setRefs] = useState<Ref[]>([]);

  const [selectedCommit, setSelectedCommit] =
    useState<Commit | null>(null);

  const [diffs, setDiffs] = useState<DiffEntry[]>([]);

  const [selectedTreeId, setSelectedTreeId] =
    useState<string | null>(null);

  const [objectCommit, setObjectCommit] =
    useState<Commit | null>(null);

  const [objectGraph, setObjectGraph] =
    useState<ObjectGraph | null>(null);

  const [objectLoading, setObjectLoading] =
    useState(false);

  const [objectError, setObjectError] =
    useState("");

  const [activePage, setActivePage] =
    useState<Page>("repository");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openRepository() {
      if (!path.trim()) {
          setError("Enter a repository path.");
          return;
      }

      setLoading(true);
      setError("");

      try {
          const repositoryData =
              await openRepositoryApi(path);

          const refsData = await getRefs(path);

          const branchCommits = await Promise.all(
              refsData
                  .filter((ref) => ref.type === "BRANCH")
                  .map((ref) => getCommits(path, ref.name))
          );

          const commitsData = Array.from(
              new Map(
                  branchCommits
                      .flat()
                      .map((commit) => [commit.id, commit])
              ).values()
          );

          setRepository(repositoryData);
          setCommits(commitsData);
          setRefs(refsData);

          setSelectedCommit(null);
          setSelectedTreeId(null);
          setObjectGraph(null);
          setDiffs([]);
      } catch (err) {
          setRepository(null);
          setCommits([]);
          setRefs([]);
          setSelectedCommit(null);
          setSelectedTreeId(null);
          setObjectGraph(null);
          setDiffs([]);

          setError(
              err instanceof Error
                  ? err.message
                  : "Something went wrong while opening the repository."
          );
      } finally {
          setLoading(false);
      }
  }
    async function selectObjectCommit(commit: Commit) {
      setObjectCommit(commit);
      setObjectGraph(null);
      setObjectError("");
      setObjectLoading(true);

      try {
        const graphData = await getObjectGraph(
          path,
          commit.id
        );

        setObjectGraph(graphData);
      } catch (err) {
        setObjectError(
          err instanceof Error
            ? err.message
            : "Could not load Git object graph."
        );
      } finally {
        setObjectLoading(false);
      }
    }
  async function selectCommit(commit: Commit) {
      setSelectedCommit(commit);
      setDiffs([]);
      setError("");

      try {
          const diffData =
              await getCommitDiff(path, commit.id);

          setDiffs(diffData);
      } catch (err) {
          setError(
              err instanceof Error
                  ? err.message
                  : "Could not load commit changes."
          );
      }
  }

  const currentBranch = refs.find(
    (ref) => ref.type === "BRANCH"
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            Git Internals Explorer
          </p>

          <h1>
            See what Git is doing under the hood.
          </h1>
        </div>

        {repository && (
          <div className="repository-status">
            <span className="status-dot" />
            Repository open
          </div>
        )}
      </header>

      <Navigation
        activePage={activePage}
        onNavigate={setActivePage}
      />

      {activePage === "repository" && (
        <>
          <RepositoryBar
            path={path}
            loading={loading}
            error={error}
            onPathChange={setPath}
            onOpen={openRepository}
          />

          {repository ? (
            <>
              <section className="repository-summary">
                <div>
                  <span className="summary-label">
                    Repository
                  </span>

                  <strong>{repository.path}</strong>
                </div>

                <div>
                  <span className="summary-label">
                    Branch
                  </span>

                  <strong>
                    {currentBranch?.name ?? "—"}
                  </strong>
                </div>

                <div>
                  <span className="summary-label">
                    Commits
                  </span>

                  <strong>{commits.length}</strong>
                </div>
              </section>

              <section className="repository-overview">
                <div className="repository-overview-header">
                  <div>
                    <span className="summary-label">
                      Repository Overview
                    </span>

                    <h2>
                      {repository.gitDirectory}
                    </h2>

                    <p>
                      Explore the branches and commit history
                      of this repository.
                    </p>
                  </div>
                </div>

                <div className="repository-overview-grid">
                  <div className="repository-overview-panel">
                    <div className="panel-header">
                      <div>
                        <span className="summary-label">
                          References
                        </span>

                        <h2>
                          Branches
                        </h2>
                      </div>

                      <span className="count-badge">
                        {refs.length}
                      </span>
                    </div>

                    <div className="repository-branch-list">
                      {refs.length === 0 ? (
                        <p className="empty-state">
                          No branches found.
                        </p>
                      ) : (
                        refs
                          .filter((ref) => ref.type === "BRANCH")
                          .map((ref) => (
                            <div
                              key={ref.name}
                              className="repository-branch-item"
                            >
                              <span className="branch-indicator">
                                ●
                              </span>

                              <span className="repository-branch-name">
                                {ref.name}
                              </span>

                              <code title={ref.target}>
                                {ref.target.slice(0, 7)}
                              </code>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <div className="repository-overview-panel">
                    <div className="panel-header">
                      <div>
                        <span className="summary-label">
                          History
                        </span>

                        <h2>
                          Recent Commits
                        </h2>
                      </div>

                      <button
                        type="button"
                        className="repository-view-button"
                        onClick={() =>
                          setActivePage("commits")
                        }
                      >
                        View commits
                      </button>
                    </div>

                    <div className="repository-recent-commits">
                      {commits.length === 0 ? (
                        <p className="empty-state">
                          No commits found.
                        </p>
                      ) : (
                        commits
                          .slice(0, 8)
                          .map((commit) => (
                            <button
                              type="button"
                              key={commit.id}
                              className="repository-recent-commit"
                              onClick={() => {
                                setActivePage("commits");
                                selectCommit(commit);
                              }}
                            >
                              <code>
                                {commit.shortId}
                              </code>

                              <span className="repository-recent-message">
                                {commit.message}
                              </span>

                              <span className="repository-recent-author">
                                {commit.author}
                              </span>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="page-placeholder">
              <span className="summary-label">
                Repository
              </span>

              <h2>
                Open a repository
              </h2>

              <p>
                Enter a GitHub repository URL above to
                begin exploring its Git internals.
              </p>
            </section>
          )}
        </>
      )}
      {activePage === "commits" && (
        <>
          <RepositoryBar
            path={path}
            loading={loading}
            error={error}
            onPathChange={setPath}
            onOpen={openRepository}
          />

          {repository ? (
            <>
              <section className="repository-summary">
                <div>
                  <span className="summary-label">
                    Repository
                  </span>

                  <strong>{repository.path}</strong>
                </div>

                <div>
                  <span className="summary-label">
                    Branch
                  </span>

                  <strong>
                    {currentBranch?.name ?? "—"}
                  </strong>
                </div>

                <div>
                  <span className="summary-label">
                    Commits
                  </span>

                  <strong>{commits.length}</strong>
                </div>
              </section>

             <section className="git-history-layout">
                 <BranchGraph
                     commits={commits}
                     refs={refs}
                     selectedCommitId={selectedCommit?.id ?? null}
                     onSelectCommit={selectCommit}
                 />

                 <div className="commit-inspection">
                     <CommitDetails
                         commit={selectedCommit}
                         diffs={diffs}
                     />
                 </div>
             </section>
            </>
          ) : (
            <section className="page-placeholder">
              <span className="summary-label">
                Commits
              </span>

              <h2>Open a repository first</h2>

              <p>
                Open a repository above to inspect its
                commit history.
              </p>
            </section>
          )}
        </>
      )}

      {activePage === "objects" && (
        <>
          <RepositoryBar
            path={path}
            loading={loading}
            error={error}
            onPathChange={setPath}
            onOpen={openRepository}
          />

          {repository ? (
            <section className="object-explorer-page">
              <div className="object-explorer-header">
                <div>
                  <span className="summary-label">
                    Git Internals
                  </span>

                  <h2>Object Explorer</h2>

                  <p>
                    Inspect the objects that make up a
                    Git commit.
                  </p>
                </div>

                <label className="object-commit-selector">
                  <span>Inspect commit</span>

                  <select
                    value={objectCommit?.id ?? ""}
                    onChange={(event) => {
                      const commit = commits.find(
                        (item) =>
                          item.id === event.target.value
                      );

                      if (commit) {
                        selectObjectCommit(commit);
                      }
                    }}
                  >
                    <option value="" disabled>
                      Select a commit
                    </option>

                    {commits.map((commit) => (
                      <option
                        key={commit.id}
                        value={commit.id}
                      >
                        {commit.shortId} —{" "}
                        {commit.message}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {objectLoading && (
                <div className="object-explorer-state">
                  Loading Git objects...
                </div>
              )}

              {objectError && (
                <div className="object-explorer-state error-message">
                  {objectError}
                </div>
              )}

              {!objectLoading &&
                !objectError &&
                !objectGraph && (
                  <div className="object-explorer-state">
                    Select a commit to inspect its Git
                    objects.
                  </div>
                )}

              {objectGraph && !objectLoading && (
                <ObjectInspector
                  objectGraph={objectGraph}
                  path={path}
                />
              )}
            </section>
          ) : (
            <section className="page-placeholder">
              <span className="summary-label">
                Git Internals
              </span>

              <h2>Open a repository first</h2>

              <p>
                Open a repository before exploring its
                Git objects.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}