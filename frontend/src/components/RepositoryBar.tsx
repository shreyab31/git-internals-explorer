type RepositoryBarProps = {
    path: string;
    loading: boolean;
    error: string;
    onPathChange: (path: string) => void;
    onOpen: () => void;
};

export function RepositoryBar({
    path,
    loading,
    error,
    onPathChange,
    onOpen,
}: RepositoryBarProps) {
    return (
        <section className="repository-bar">
            <label htmlFor="repository-path">
                GitHub Repository URL
            </label>

            <div className="repository-input-row">
                <input
                    id="repository-path"
                    value={path}
                    onChange={(event) =>
                        onPathChange(event.target.value)
                    }
                    placeholder="https://github.com/owner/repository"
                />

                <button
                    onClick={onOpen}
                    disabled={loading}
                >
                    {loading
                        ? "Loading..."
                        : "Explore Repository"}
                </button>
            </div>

            {error && (
                <p className="error-message">
                    {error}
                </p>
            )}
        </section>
    );
}