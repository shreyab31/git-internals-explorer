import { useEffect, useState } from "react";

type BlobData = {
  objectId: string;
  size: number;
  content: string;
  binary: boolean;
};

type BlobViewerProps = {
  path: string;
  blobId: string;
  fileName: string;
};

export function BlobViewer({
  path,
  blobId,
  fileName,
}: BlobViewerProps) {
  const [blob, setBlob] = useState<BlobData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBlob() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ path });

        const response = await fetch(
          `/api/repositories/blobs/${blobId}?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Could not load blob.");
        }

        const data: BlobData = await response.json();

        setBlob(data);
      } catch (err) {
        setBlob(null);

        setError(
          err instanceof Error
            ? err.message
            : "Could not load blob."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBlob();
  }, [path, blobId]);

  return (
    <section className="blob-viewer">
      <div className="panel-header">
        <div>
          <span className="summary-label">Git object</span>
          <h2>{fileName}</h2>
        </div>
      </div>

      {loading && (
        <p className="empty-state">
          Loading file...
        </p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {blob && !loading && !error && (
        blob.binary ? (
          <div className="empty-details">
            <h3>Binary file</h3>
            <p>
              This blob contains binary data and cannot be displayed as
              text.
            </p>
            <span className="summary-label">
              {blob.size} bytes
            </span>
          </div>
        ) : (
          <pre className="blob-content">
            <code>{blob.content}</code>
          </pre>
        )
      )}
    </section>
  );
}