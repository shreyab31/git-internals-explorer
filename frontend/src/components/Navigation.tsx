type NavigationProps = {
  activePage: "repository" | "commits" | "objects";
  onNavigate: (
    page: "repository" | "commits" | "objects"
  ) => void;
};

const pages = [
  {
    id: "repository" as const,
    label: "Repository",
  },
  {
    id: "commits" as const,
    label: "Commits",
  },
  {
    id: "objects" as const,
    label: "Objects",
  },
];

export function Navigation({
  activePage,
  onNavigate,
}: NavigationProps) {
  return (
    <nav className="main-navigation" aria-label="Main navigation">
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          className={
            activePage === page.id
              ? "navigation-item active"
              : "navigation-item"
          }
          onClick={() => onNavigate(page.id)}
        >
          {page.label}
        </button>
      ))}
    </nav>
  );
}