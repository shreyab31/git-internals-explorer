import { useEffect, useState } from "react";
import { BlobViewer } from "./BlobViewer";
import type { TreeEntry } from "../types/git";

type RepositoryExplorerProps = {
  path: string;
  treeId: string;
};

export function RepositoryExplorer({
  path,
  treeId,
}: RepositoryExplorerProps) {
  const [entries, setEntries] = useState<TreeEntry[]>([]);
  const [currentTreeId, setCurrentTreeId] = useState(treeId);
  const [treeHistory, setTreeHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBlob, setSelectedBlob] = useState<{
    objectId: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTreeId(treeId);
    setTreeHistory([]);
  }, [treeId]);

  useEffect(() => {
    async function loadTree() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ path });

        const response = await fetch(
          `/api/repositories/trees/${currentTreeId}?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Could not load repository tree.");
        }

        const data: TreeEntry[] = await response.json();

        setEntries(data);
      } catch (err) {
        setEntries([]);

        setError(
          err instanceof Error
            ? err.message
            : "Could not load repository tree."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTree();
  }, [path, currentTreeId]);

  function openTree(objectId: string) {
    setTreeHistory((history) => [...history, currentTreeId]);
    setCurrentTreeId(objectId);
  }

  function goBack() {
    setTreeHistory((history) => {
      if (history.length === 0) {
        return history;
      }

      const previousTreeId = history[history.length - 1];

      setCurrentTreeId(previousTreeId);

      return history.slice(0, -1);
    });
  }
function openBlob(entry: TreeEntry) {
  setSelectedBlob({
    objectId: entry.objectId,
    name: entry.name,
  });
}
  return (
    <section className="repository-explorer">
      <div className="panel-header">
        <div>
          <span className="summary-label">Git object</span>
          <h2>Repository Tree</h2>
        </div>

        <button
          type="button"
          onClick={goBack}
          disabled={treeHistory.length === 0}
        >
          Back
        </button>
      </div>

      {loading && (
        <p className="empty-state">
          Loading tree...
        </p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="tree-list">
          {entries.map((entry) => (
            <div
              className="tree-item"
              key={entry.objectId}
            >
              {entry.type === "TREE" ? (
                <button
                  type="button"
                  onClick={() => openTree(entry.objectId)}
                >
                  📁 {entry.name}
                </button>
              ) : entry.type === "BLOB" ? (
                <button
                  type="button"
                  onClick={() => openBlob(entry)}
                >
                  📄 {entry.name}
                </button>
              ) : (
                <div>
                  <span>◇</span>

                  <code>{entry.name}</code>

                  <span className="summary-label">
                    {entry.type}
                  </span>
                </div>
              )}
            </div>
          ))}

          {entries.length === 0 && (
            <p className="empty-state">
              This tree is empty.
            </p>
          )}
        </div>
      )}
  {selectedBlob && (
    <BlobViewer
      path={path}
      blobId={selectedBlob.objectId}
      fileName={selectedBlob.name}
    />
  )}
    </section>
  );
}