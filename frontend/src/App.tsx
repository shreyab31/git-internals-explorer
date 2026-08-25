import { useEffect, useState } from "react";
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

const STORAGE_KEY = "git-internals-explorer-state";

type StoredRepositoryState = {
    path: string;
    repository: RepositoryInfo;
    commits: Commit[];
    refs: Ref[];
    selectedBranch: Ref | null;
    activePage: Page;
};

export function App() {
  const [path, setPath] = useState("");

  const [repository, setRepository] =
    useState<RepositoryInfo | null>(null);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [refs, setRefs] = useState<Ref[]>([]);

  const [selectedCommit, setSelectedCommit] =
    useState<Commit | null>(null);

  const [selectedBranch, setSelectedBranch] =
  useState<Ref | null>(null);

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
  const [refsLoading, setRefsLoading] = useState(false);
  useEffect(() => {
      try {
          const stored =
              localStorage.getItem(STORAGE_KEY);

          if (!stored) {
              return;
          }

          const saved =
              JSON.parse(stored) as StoredRepositoryState;

          if (
              !saved.path ||
              !saved.repository ||
              !Array.isArray(saved.commits) ||
              !Array.isArray(saved.refs)
          ) {
              localStorage.removeItem(STORAGE_KEY);
              return;
          }

          setPath(saved.path);
          setRepository(saved.repository);
          setCommits(saved.commits);
          setRefs(saved.refs);
          setSelectedBranch(
              saved.selectedBranch
          );
          setActivePage(
              saved.activePage ?? "repository"
          );
      } catch {
          localStorage.removeItem(STORAGE_KEY);
      }
  }, []);

  async function openRepository() {
      if (!path.trim()) {
          setError("Enter a repository URL.");
          return;
      }

      setLoading(true);
      setError("");

      try {
          const repositoryData =
              await openRepositoryApi(path);

          const commitsData =
              await getCommits(
                  path,
                  repositoryData.defaultBranch,
                  30
              );

          const defaultBranch: Ref = {
              name: repositoryData.defaultBranch,
              type: "BRANCH",
              target: null,
          };

          setRepository(repositoryData);
          setCommits(commitsData);
          setSelectedBranch(defaultBranch);

          setSelectedCommit(null);
          setSelectedTreeId(null);
          setObjectGraph(null);
          setObjectCommit(null);
          setDiffs([]);

          /*
           * Load branches in the background.
           * Do NOT make repository opening wait for this.
           */
          setRefsLoading(true);

          getRefs(path)
              .then((refsData) => {
                  setRefs(refsData);

                  const actualDefaultBranch =
                      refsData.find(
                          (ref) =>
                              ref.type === "BRANCH" &&
                              ref.name ===
                                  repositoryData.defaultBranch
                      );

                  const branch =
                      actualDefaultBranch ?? defaultBranch;

                  setSelectedBranch(branch);

                  localStorage.setItem(
                      STORAGE_KEY,
                      JSON.stringify({
                          path,
                          repository: repositoryData,
                          commits: commitsData,
                          refs: refsData,
                          selectedBranch: branch,
                          activePage,
                      } satisfies StoredRepositoryState)
                  );
              })
              .catch((err) => {
                  console.error(
                      "Could not load repository references.",
                      err
                  );
              })
              .finally(() => {
                  setRefsLoading(false);
              });
      } catch (err) {
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

  const currentBranch = selectedBranch;
  async function selectBranch(branch: Ref) {
      setSelectedBranch(branch);
      setSelectedCommit(null);
      setDiffs([]);
      setError("");
      setLoading(true);

     try {
         const branchCommits = await getCommits(
             path,
             branch.name,
             30
         );

         setCommits(branchCommits);

         if (repository) {
             localStorage.setItem(
                 STORAGE_KEY,
                 JSON.stringify({
                     path,
                     repository,
                     commits: branchCommits,
                     refs,
                     selectedBranch: branch,
                     activePage,
                 } satisfies StoredRepositoryState)
             );
         }
      } catch (err) {
          setCommits([]);

          setError(
              err instanceof Error
                  ? err.message
                  : "Could not load branch commits."
          );
      } finally {
          setLoading(false);
      }
  }
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
          onNavigate={(page) => {
              setActivePage(page);

              if (repository) {
                  localStorage.setItem(
                      STORAGE_KEY,
                      JSON.stringify({
                          path,
                          repository,
                          commits,
                          refs,
                          selectedBranch,
                          activePage: page,
                      } satisfies StoredRepositoryState)
                  );
              }
          }}
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
                      {refsLoading ? (
                          <p className="empty-state">
                              Loading branches...
                          </p>
                      ) : refs.length === 0 ? (
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

                             <code title={ref.target ?? ""}>
                               {ref.target?.slice(0, 7) ?? "—"}
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
                        onClick={() => {
                            setActivePage("commits");

                            if (repository) {
                                localStorage.setItem(
                                    STORAGE_KEY,
                                    JSON.stringify({
                                        path,
                                        repository,
                                        commits,
                                        refs,
                                        selectedBranch,
                                        activePage: "commits",
                                    } satisfies StoredRepositoryState)
                                );
                            }
                        }}
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
            <section className="commit-branch-selector">
                <div>
                    <span className="summary-label">
                        Branch
                    </span>

                    <h2>
                        Choose a branch to inspect
                    </h2>
                </div>

                <select
                    className="branch-selector"
                    value={selectedBranch?.name ?? ""}
                    onChange={(event) => {
                        const branch = refs.find(
                            (ref) =>
                                ref.type === "BRANCH" &&
                                ref.name === event.target.value
                        );

                        if (branch) {
                            selectBranch(branch);
                        }
                    }}
                >
                    <option value="" disabled>
                        Select branch
                    </option>

                    {refs
                        .filter((ref) => ref.type === "BRANCH")
                        .map((ref) => (
                            <option
                                key={ref.name}
                                value={ref.name}
                            >
                                {ref.name}
                            </option>
                        ))}
                </select>
            </section>
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
                     selectedBranch={selectedBranch}
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
                  onSelectCommit={(commitId) => {
                    const commit = commits.find(
                      (item) => item.id === commitId
                    );

                    if (commit) {
                      selectObjectCommit(commit);
                    }
                  }}
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