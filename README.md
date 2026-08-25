# Git Internals Explorer

A portfolio-ready full-stack application for learning how Git works internally.

## Architecture

```text
React + TypeScript  -->  Spring Boot REST API  -->  JGit / local repositories
                                      |
                                      +--> PostgreSQL (application metadata only)
```

Git remains the source of truth for commits, branches, trees, blobs, the index,
and the working tree. PostgreSQL will hold application data such as saved
repository sessions, bookmarks, and history.

## Repository layout

- `frontend/` — React and TypeScript interface
- `backend/` — Spring Boot API and future JGit integration
- `infra/` — local Docker services
- `.github/` — continuous-integration workflow

## Milestones

1. **Foundation (current):** runnable frontend/API shells and local PostgreSQL.
2. Repository registration and saved sessions.
3. Working tree, staging area, and commits.
4. Commit graph, branches, and HEAD.
5. Git object and diff exploration.
6. Merge and three-way merge visualization.

## Run locally

Start PostgreSQL:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Start the API from `backend/` with a Java 21+ Maven environment:

```bash
mvn spring-boot:run
```

Start the UI from `frontend/`:

```bash
npm install
npm run dev
```

The UI is configured to call the API through Vite's development proxy.
