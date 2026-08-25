import { useEffect, useState } from "react";
import type {
  ObjectGraph,
  ObjectTreeEntry,
} from "../api/repositoryApi";
import { BlobViewer } from "./BlobViewer";

type ObjectGraphViewProps = {
  objectGraph: ObjectGraph;
  path: string;
};

type SelectedObject = {
  type: string;
  id: string;
  name?: string;
  path?: string;
};

function shortId(id: string) {
  return id.slice(0, 10);
}

function TreeEntryNode({
  entry,
  depth = 0,
  path = "",
  selectedId,
  onSelect,
}: {
  entry: ObjectTreeEntry;
  depth?: number;
  path?: string;
  selectedId: string | null;
  onSelect: (object: SelectedObject) => void;
}) {
  const isTree = entry.type === "TREE";

  const [expanded, setExpanded] = useState(true);

  const currentPath = path
    ? `${path}/${entry.name}`
    : entry.name;

  const isSelected = selectedId === entry.id;

  return (
    <div className="git-tree-node">
      <div
        className={`git-tree-row ${
          isSelected ? "git-tree-row-selected" : ""
        }`}
        style={{
          paddingLeft: `${depth * 1.25}rem`,
        }}
        onClick={() =>
          onSelect({
            type: entry.type,
            id: entry.id,
            name: entry.name,
            path: currentPath,
          })
        }
      >
        {isTree ? (
          <button
            className="git-tree-toggle"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
            type="button"
            aria-label={
              expanded
                ? "Collapse folder"
                : "Expand folder"
            }
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="git-tree-spacer" />
        )}

        <span
          className={
            isTree
              ? "git-tree-icon folder-icon"
              : "git-tree-icon file-icon"
          }
        >
          {isTree ? "📁" : "📄"}
        </span>

        <span className="git-tree-name">
          {entry.name}
        </span>

        <span
          className={`git-tree-badge ${
            isTree
              ? "tree-badge"
              : "blob-badge"
          }`}
        >
          {entry.type}
        </span>

        <code
          className="git-tree-sha"
          title={entry.id}
        >
          {shortId(entry.id)}
        </code>
      </div>

      {isTree &&
        expanded &&
        entry.children.length > 0 && (
          <div className="git-tree-children">
            {entry.children.map((child) => (
              <TreeEntryNode
                key={`${child.name}-${child.id}`}
                entry={child}
                depth={depth + 1}
                path={currentPath}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
    </div>
  );
}

function ObjectCard({
  type,
  id,
  title,
  subtitle,
  className = "",
  selected = false,
  onClick,
}: {
  type: string;
  id?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const cardClass = [
    "git-object-card",
    className,
    selected
      ? "git-object-card-selected"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cardClass}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (
          onClick &&
          (event.key === "Enter" ||
            event.key === " ")
        ) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <span className="git-object-type">
        {type}
      </span>

      {title && (
        <strong className="git-object-title">
          {title}
        </strong>
      )}

      {subtitle && (
        <span className="git-object-subtitle">
          {subtitle}
        </span>
      )}

      {id && (
        <code title={id}>
          {shortId(id)}
        </code>
      )}
    </div>
  );
}

export function ObjectGraphView({
  objectGraph,
  path,
}: ObjectGraphViewProps) {
  const [selectedObject, setSelectedObject] =
    useState<SelectedObject>({
      type: "COMMIT",
      id: objectGraph.commitId,
      name: "Selected commit",
    });

  useEffect(() => {
    setSelectedObject({
      type: "COMMIT",
      id: objectGraph.commitId,
      name: "Selected commit",
    });
  }, [objectGraph.commitId]);

  function selectObject(
    object: SelectedObject
  ) {
    setSelectedObject(object);
  }

  const commitSelected =
    selectedObject.id ===
    objectGraph.commitId;

  const treeSelected =
    selectedObject.id ===
    objectGraph.tree.id;

  const selectedBlob =
    selectedObject.type === "BLOB" &&
    selectedObject.path &&
    selectedObject.id
      ? {
          id: selectedObject.id,
          path: selectedObject.path,
          name:
            selectedObject.name ??
            selectedObject.path,
        }
      : null;

  return (
    <section className="git-object-graph">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="git-object-graph-header">
        <div>
          <span className="summary-label">
            Git Internals
          </span>

          <h3>
            How this commit is stored
          </h3>

          <p>
            Follow the commit to its parents,
            tree and file objects.
          </p>
        </div>

        <code
          className="git-full-sha"
          title={objectGraph.commitId}
        >
          {shortId(objectGraph.commitId)}
        </code>
      </header>

      {/* =================================================
          VERTICAL OBJECT FLOW
      ================================================= */}

      <section className="git-object-flow">

        {/* COMMIT */}

        <div className="git-flow-step">
          <span className="git-flow-label">
            COMMIT OBJECT
          </span>

          <ObjectCard
            type="COMMIT"
            title="Selected commit"
            subtitle="The commit you are inspecting"
            id={objectGraph.commitId}
            className="commit-object"
            selected={commitSelected}
            onClick={() =>
              selectObject({
                type: "COMMIT",
                id: objectGraph.commitId,
                name: "Selected commit",
              })
            }
          />

          <p className="git-flow-explanation">
            A commit stores information about
            the change, its author/committer,
            its parent commit(s), and the tree
            representing the repository snapshot.
          </p>
        </div>

        <div className="git-flow-arrow">
          ↓
        </div>

        {/* PARENTS */}

        <div className="git-flow-step">
          <span className="git-flow-label">
            PARENT COMMIT{objectGraph.parentIds.length !== 1 ? "S" : ""}
          </span>

          <p className="git-flow-description">
            This tells you where this commit
            came from.
          </p>

          {objectGraph.parentIds.length === 0 ? (
            <div className="git-root-card">
              <span className="root-icon">
                ◎
              </span>

              <div>
                <strong>
                  Root commit
                </strong>

                <span>
                  This commit has no parent.
                </span>
              </div>
            </div>
          ) : (
            <div className="git-parent-list">
              {objectGraph.parentIds.map(
                (parentId, index) => (
                  <ObjectCard
                    key={parentId}
                    type={
                      objectGraph.parentIds
                        .length > 1
                        ? `PARENT ${index + 1}`
                        : "PARENT"
                    }
                    title="Previous commit"
                    subtitle="Commit this was based on"
                    id={parentId}
                    className="parent-object"
                    selected={
                      selectedObject.id ===
                      parentId
                    }
                    onClick={() =>
                      selectObject({
                        type: "COMMIT",
                        id: parentId,
                        name:
                          objectGraph
                            .parentIds
                            .length > 1
                            ? `Parent commit ${
                                index + 1
                              }`
                            : "Parent commit",
                      })
                    }
                  />
                )
              )}
            </div>
          )}
        </div>

        <div className="git-flow-arrow">
          ↓
        </div>

        {/* TREE */}

        <div className="git-flow-step">
          <span className="git-flow-label">
            TREE OBJECT
          </span>

          <ObjectCard
            type="TREE"
            title="Root tree"
            subtitle="The complete repository snapshot"
            id={objectGraph.tree.id}
            className="tree-object"
            selected={treeSelected}
            onClick={() =>
              selectObject({
                type: "TREE",
                id: objectGraph.tree.id,
                name: "Root tree",
              })
            }
          />

          <p className="git-flow-explanation">
            This tree represents what the entire
            repository looked like at this commit.
            Folders point to other trees and files
            point to blobs.
          </p>
        </div>
      </section>

      {/* =================================================
          TREE CONTENTS
      ================================================= */}

      <section className="git-tree-section">

        <div className="git-tree-section-header">
          <div>
            <span className="git-flow-label">
              TREE CONTENTS
            </span>

            <h4>
              Repository snapshot
            </h4>

            <p>
              These are the files and directories
              stored in the tree for this commit.
            </p>
          </div>

          <span className="git-tree-count">
            {objectGraph.tree.entries.length}{" "}
            entries
          </span>
        </div>

        <div className="git-file-tree">

          <div className="git-tree-root">
            <span className="git-tree-root-icon">
              📁
            </span>

            <div>
              <strong>
                Repository root
              </strong>

              <span>
                TREE ·{" "}
                {shortId(objectGraph.tree.id)}
              </span>
            </div>
          </div>

          {objectGraph.tree.entries.length ===
          0 ? (
            <p className="git-tree-empty">
              This tree contains no entries.
            </p>
          ) : (
            objectGraph.tree.entries.map(
              (entry) => (
                <TreeEntryNode
                  key={`${entry.name}-${entry.id}`}
                  entry={entry}
                  selectedId={
                    selectedObject.id
                  }
                  onSelect={selectObject}
                />
              )
            )
          )}
        </div>
      </section>

      {/* =================================================
          SELECTED OBJECT
      ================================================= */}

      <section className="git-object-details">

        <div className="git-object-details-heading">
          <div>
            <span className="git-flow-label">
              SELECTED OBJECT
            </span>

            <h4>
              {selectedObject.name ??
                selectedObject.type}
            </h4>
          </div>

          <span className="git-selected-type">
            {selectedObject.type}
          </span>
        </div>

        <div className="git-object-details-grid">

          <div>
            <span>
              OBJECT ID
            </span>

            <code
              title={selectedObject.id}
            >
              {selectedObject.id}
            </code>
          </div>

          {selectedObject.path && (
            <div>
              <span>
                PATH
              </span>

              <code>
                {selectedObject.path}
              </code>
            </div>
          )}

        </div>
      </section>

      {/* =================================================
          BLOB CONTENT
      ================================================= */}

      {selectedBlob && (
        <BlobViewer
          path={path}
          blobId={selectedBlob.id}
          fileName={selectedBlob.name}
        />
      )}

    </section>
  );
}