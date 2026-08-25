import type { ObjectGraph } from "../api/repositoryApi";
import { ObjectGraphView } from "./ObjectGraphView";

type ObjectInspectorProps = {
  objectGraph: ObjectGraph | null;
  path: string;
};

export function ObjectInspector({
  objectGraph,
  path,
}: ObjectInspectorProps) {
  if (!objectGraph) {
    return (
      <section className="object-inspector">
        <div className="panel-header">
          <div>
            <span className="summary-label">
              Git internals
            </span>

            <h2>
              Object Relationships
            </h2>
          </div>
        </div>

        <p className="empty-state">
          Select a commit to inspect its Git objects.
        </p>
      </section>
    );
  }

  return (
    <section className="object-inspector">
      <div className="panel-header">
        <div>
          <span className="summary-label">
            Git internals
          </span>

          <h2>
            Object Relationships
          </h2>
        </div>
      </div>

      <ObjectGraphView
        objectGraph={objectGraph}
        path={path}
      />
    </section>
  );
}