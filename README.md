# Git Internals Explorer

> **An interactive full-stack tool for exploring what Git is actually doing under the hood.**

Git is usually experienced through commands:

```bash
git commit
git branch
git log
git diff
git checkout
```

But those commands are only the interface.

Underneath them, Git is built around a content-addressed object database containing **commits, trees, blobs, and references**, connected through a directed graph of objects.

**Git Internals Explorer makes that underlying model visible.**

Instead of treating a commit as just another row in a history list, the application lets you explore the relationships between:

```text
Branch / Reference
        │
        ▼
      Commit
      /    \
     ▼      ▼
  Parent    Tree
              │
        ┌─────┴─────┐
        ▼           ▼
      Tree         Blob
        │
        ▼
      Blob
```

The project combines a **React + TypeScript frontend**, a **Spring Boot REST API**, GitHub's API for remote repository inspection, and a **JGit-based foundation for local repository inspection**.

---

## 🎯 Why Git Internals Explorer?

Git is often taught from the command line:

```bash
git log
git branch
git show
git diff
```

That teaches developers **how to use Git**, but not necessarily **how Git represents the repository internally**.

For example, when you run:

```bash
git commit
```

Git does not simply create a "commit record" containing a list of files.

A commit points to a **tree**, the tree points to other trees and blobs, and the commit also points to its parent commit(s).

Similarly, a branch is not a copy of a commit history. It is essentially a **reference pointing to a commit**.

Git Internals Explorer was built around this idea:

```text
Git Command
     ↓
Git Concept
     ↓
Git Object
     ↓
Object Relationship
     ↓
Visual Exploration
```

The goal is to make those relationships easier to understand by allowing developers to inspect the underlying data directly.

---

# ✨ Features

## 🌐 Remote GitHub Repository Exploration

The primary repository workflow currently focuses on **remote GitHub repositories**.

A user can provide a GitHub repository URL such as:

```text
https://github.com/anthropics/claude-code
```

The frontend sends the repository information to the Spring Boot backend, which communicates with GitHub's REST API and transforms the returned Git data into application-specific responses.

The application can retrieve and visualize information such as:

- Repository metadata
- Branches
- Commit history
- Commit relationships
- Commit diffs
- Git object relationships
- Trees
- Blobs
- File contents

This means a repository does not need to be cloned locally just to explore its Git structure.

---

# 🧬 Understanding the Git Object Model

The central concept behind the project is Git's object model.

At a simplified level:

```text
                    Commit
                   /      \
                  /        \
             Parent        Tree
               │             │
               │        ┌────┴────┐
               │        │         │
               ▼        ▼         ▼
            Commit     Tree      Blob
                         │
                    ┌────┴────┐
                    ▼         ▼
                  Blob      Tree
                              │
                              ▼
                             Blob
```

The application exposes these relationships rather than hiding them behind a conventional file browser.

### Commit

A Git commit contains information such as:

- Commit object ID
- Parent commit IDs
- Root tree
- Author
- Committer
- Timestamps
- Commit message

### Tree

A Git tree represents a directory snapshot.

A tree can point to:

- Other trees
- Blobs
- Gitlinks

### Blob

A blob represents file contents.

### Reference

A reference such as `main` points to a commit.

```text
main
  │
  ▼
abc1234...
  │
  ▼
Commit
```

This distinction is important because a branch itself does not contain a separate copy of the repository.

---

# 🌳 Repository Tree Explorer

Git trees are represented recursively.

For example, a repository may appear conceptually as:

```text
TREE
├── backend/
│   ├── src/
│   │   ├── main/
│   │   └── test/
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── infra/
│
├── .gitignore
└── README.md
```

The backend converts GitHub's tree representation into a hierarchical structure that can be consumed by the frontend.

Object types are mapped into application-level representations such as:

```text
TREE
BLOB
SYMLINK
GITLINK
UNKNOWN
```

This lets the UI distinguish between a directory-like Git tree and actual file/blob objects.

---

# 📦 Blob Inspection

Git stores file contents as **blob objects**.

The application can retrieve a blob by its Git object ID.

The remote data flow is approximately:

```text
Blob SHA
   │
   ▼
GitHub Git API
   │
   ▼
Base64 encoded content
   │
   ▼
Decoded bytes
   │
   ├── Binary
   │
   └── Text
         │
         ▼
     File viewer
```

The backend checks the decoded content before displaying it as text.

Binary data is therefore not blindly rendered as source code.

---

# 🌿 Branches & References

Branches are represented as references pointing to commits.

For example:

```text
main ──────────────► abc1234
                       │
                       ▼
                     Commit
```

The backend retrieves repository branches and resolves each branch to its target commit SHA.

This allows the application to connect the familiar concept of:

```text
"main branch"
```

to the underlying Git concept:

```text
"reference → commit"
```

---

# 🕐 Commit History

The application retrieves commit history for a selected reference.

Each commit can contain information including:

- Full commit SHA
- Short SHA
- Commit message
- Author
- Author timestamp
- Committer
- Committer timestamp
- Parent commit IDs
- Reference information

For example:

```text
abc1234  Fix repository parsing
   │
   ├── parent → 8a71f32
   │
   └── tree  → 91c82ab
```

This makes the history more than a chronological list: it becomes a representation of the commit graph.

---

# 🔀 Commit Diffs

The application can inspect the changes associated with a commit.

Diff information includes:

- Previous path
- New path
- Change status
- Number of additions
- Number of deletions
- Patch information

Typical change types include:

```text
ADD
MODIFY
DELETE
RENAME
```

This allows users to connect a commit to both:

```text
Commit
   │
   ├── Parents
   │
   ├── Tree
   │
   └── Changes / Diff
```

---

# 🔗 Object Relationships

One of the main UI concepts is the relationship between Git objects.

For a selected commit, the application can expose:

```text
                Commit
               /      \
              /        \
        Parent          Tree
          │               │
          ▼               ▼
       Commit           Tree
                          │
                    ┌─────┴─────┐
                    ▼           ▼
                  Blob         Tree
                                │
                                ▼
                               Blob
```

This is useful for understanding why Git can represent large repositories efficiently without storing an entirely independent copy of every file for every commit.

---

# 🖥️ Interactive Frontend

The frontend is built with **React and TypeScript** and provides the visual layer for the Git data exposed by the backend.

The UI is organized around concepts such as:

- Repository exploration
- Commit history
- Branch/reference information
- Commit details
- Commit graph visualization
- Object graph visualization
- Repository tree exploration
- Blob/file inspection
- Diff information

The frontend communicates with the backend through HTTP APIs rather than directly accessing GitHub.

```text
React / TypeScript
        │
        │ HTTP
        ▼
Spring Boot REST API
        │
        ▼
GitHub / JGit
```

This separation keeps repository access logic out of the browser.

---

# 🏗️ Architecture

The application follows a frontend/backend architecture:

```text
┌──────────────────────────────────────────────┐
│                  Frontend                    │
│                                              │
│             React + TypeScript               │
│                    │                         │
│             Repository UI                    │
│             Commit Graph                     │
│             Object Explorer                  │
│             Blob Viewer                      │
│             Commit Details                   │
└────────────────────┬─────────────────────────┘
                     │
                     │ HTTP / JSON
                     ▼
┌──────────────────────────────────────────────┐
│                  Backend                     │
│                                              │
│              Spring Boot REST API            │
│                    │                         │
│             Repository Layer                 │
│              /            \                  │
│             /              \                 │
│            ▼                ▼                │
│     GitHubService     RepositoryService      │
│            │                │                │
│            ▼                ▼                │
│      GitHub REST API       JGit               │
└──────────────────────────────────────────────┘
```

The important architectural distinction is between the two repository sources:

```text
Remote Repository
       │
       ▼
 GitHub REST API

Local Repository
       │
       ▼
      JGit
```

The current user-facing workflow is primarily focused on **remote GitHub repositories**.

The backend also contains JGit-based local repository functionality, which is intentionally being retained as the foundation for a deeper local-repository workflow.

---

# ⚙️ Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React | UI and component architecture |
| TypeScript | Type-safe frontend development |
| Vite | Development server and frontend build tooling |
| ESLint | Code quality and linting |

## Backend

| Technology | Purpose |
|---|---|
| Java 21 | Backend language/runtime |
| Spring Boot | REST API and application framework |
| JGit | Local Git repository inspection |
| Jackson | JSON parsing and transformation |
| Maven | Dependency and build management |

## External Services / Infrastructure

| Technology | Purpose |
|---|---|
| GitHub REST API | Remote repository and Git object access |
| PostgreSQL | Application database infrastructure |
| Flyway | Database migrations |
| Docker | Local PostgreSQL environment |
| GitHub Actions | Continuous integration |

---

# 🔌 REST API

The frontend communicates with the Spring Boot backend through repository-oriented REST endpoints.

## Health

```http
GET /api/health
```

Used to verify that the API is running.

---

## Open Repository

```http
POST /api/repositories/open?path=<repository-url>
```

Resolves a GitHub repository and retrieves basic repository information.

---

## References

```http
GET /api/repositories/refs?path=<repository-url>
```

Retrieves repository branches and their target commit IDs.

---

## Commit History

```http
GET /api/repositories/commits
    ?path=<repository-url>
    &ref=<branch>
    &limit=<number>
```

Retrieves commits associated with a reference.

---

## Commit Diff

```http
GET /api/repositories/commits/{commitId}/diff
    ?path=<repository-url>
```

Retrieves changes associated with a commit.

---

## Commit Object Graph

```http
GET /api/repositories/commits/{commitId}/objects
    ?path=<repository-url>
```

Retrieves the commit's parent relationships and associated object tree.

---

## Blob

```http
GET /api/repositories/blobs/{blobId}
    ?path=<repository-url>
```

Retrieves blob metadata and content.

---

# 🔄 Remote Repository Data Flow

When a user explores a GitHub repository, the request path is approximately:

```text
User
 │
 │ GitHub repository URL
 ▼
React Frontend
 │
 │ HTTP request
 ▼
RepositoryController
 │
 ▼
GitHubService
 │
 │ Parse owner/repository
 ▼
GitHub REST API
 │
 ├── Repository metadata
 ├── Branches
 ├── Commits
 ├── Commit details
 ├── Git trees
 └── Git blobs
 │
 ▼
Backend DTOs
 │
 ▼
React Components
 │
 ▼
Interactive Git visualization
```

The backend therefore acts as a translation layer between GitHub's external API representation and the application's own API models.

---

# 🧠 Engineering Decisions

## Why GitHub's API?

The main remote workflow is designed so that users do not have to clone a repository before exploring it.

Instead:

```text
GitHub URL
    ↓
GitHub API
    ↓
Git metadata
    ↓
Application
```

This makes the explorer useful for quickly investigating repositories hosted on GitHub.

---

## Why JGit?

For local repository exploration, the project uses **JGit** rather than repeatedly invoking the Git executable through shell commands.

JGit provides programmatic access to Git concepts such as:

- commits
- trees
- blobs
- references
- object IDs
- diffs

This keeps Git-specific operations inside the Java application.

---

## Why keep remote and local implementations separate?

Remote and local repositories have fundamentally different access mechanisms:

```text
Remote
  │
  └── HTTP
       └── GitHub REST API


Local
  │
  └── Filesystem
       └── JGit
```

Keeping those implementations separate prevents GitHub-specific HTTP logic from being tightly coupled to local filesystem operations.

It also leaves room for a future common repository abstraction without throwing away the existing local implementation.

---

# 🔐 GitHub Authentication

The backend optionally supports a GitHub personal access token through:

```text
GITHUB_TOKEN
```

When configured, the token is included in GitHub API requests.

This is useful for authenticated API access and higher GitHub API rate limits.

Credentials should always be supplied through environment variables or deployment secrets.

**Never commit a GitHub token to the repository.**

Example:

```bash
GITHUB_TOKEN=your_token_here
```

---

# 🗄️ Database & Migrations

The application includes PostgreSQL infrastructure and Flyway database migration support.

For local development, PostgreSQL can be run through Docker.

The local development setup uses:

```text
Host
5433
  │
  ▼
PostgreSQL container
5432
```

The Git object data retrieved from GitHub is **not simply stored as a copy of the Git repository inside PostgreSQL**.

PostgreSQL is application infrastructure, while GitHub/JGit remain the sources for repository and Git-object information.

Production database configuration should be supplied through environment-specific configuration rather than hard-coded credentials.

---

# 📁 Project Structure

```text
git-internals-explorer/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/gitexplorer/api/
│   │   │   │       │
│   │   │   │       ├── dto/
│   │   │   │       │   ├── BlobResponse.java
│   │   │   │       │   ├── CommitResponse.java
│   │   │   │       │   ├── DiffEntryResponse.java
│   │   │   │       │   ├── ObjectGraphResponse.java
│   │   │   │       │   ├── ObjectTreeEntryResponse.java
│   │   │   │       │   ├── ObjectTreeResponse.java
│   │   │   │       │   ├── RefResponse.java
│   │   │   │       │   ├── TreeEntryResponse.java
│   │   │   │       │   └── TreeResponse.java
│   │   │   │       │
│   │   │   │       ├── health/
│   │   │   │       │   └── HealthController.java
│   │   │   │       │
│   │   │   │       ├── repository/
│   │   │   │       │   ├── RepositoryController.java
│   │   │   │       │   ├── GitHubService.java
│   │   │   │       │   └── RepositoryService.java
│   │   │   │       │
│   │   │   │       └── GitInternalsExplorerApplication.java
│   │   │   │
│   │   │   └── resources/
│   │   │       └── application.yml
│   │   │
│   │   └── test/
│   │
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BranchGraph.tsx
│   │   │   ├── CommitDetails.tsx
│   │   │   ├── ObjectGraphView.tsx
│   │   │   ├── RepositoryExplorer.tsx
│   │   │   └── ...
│   │   │
│   │   ├── types/
│   │   │   └── git.ts
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── infra/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .gitignore
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Install:

- Java 21
- Maven
- Node.js
- npm
- Docker Desktop
- Git
- PostgreSQL client/tools if you want to inspect the database manually

---

## 1. Clone the repository

```bash
git clone https://github.com/shreyab31/git-internals-explorer.git
cd git-internals-explorer
```

---

## 2. Start PostgreSQL

From the project directory:

```bash
docker compose up -d
```

Verify that PostgreSQL is running:

```bash
docker ps
```

You should see the PostgreSQL container with:

```text
5433 → 5432
```

---

## 3. Configure GitHub authentication

Set your GitHub token as an environment variable if authenticated GitHub API access is required.

### Windows PowerShell

```powershell
$env:GITHUB_TOKEN="your_token_here"
```

### Linux/macOS

```bash
export GITHUB_TOKEN="your_token_here"
```

Do not commit the token.

---

# ▶️ Running the Backend

Move into the backend directory:

```bash
cd backend
```

Run:

```bash
mvn spring-boot:run
```

The Spring Boot API runs locally on its configured port.

---

# ▶️ Running the Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will start the frontend development server.

The frontend communicates with the local Spring Boot backend through the configured development API proxy.

---

# 🧪 Testing & Continuous Integration

The repository includes GitHub Actions CI for both the frontend and backend.

The CI pipeline verifies the project on pushes to `main` and pull requests.

### Frontend CI

The frontend pipeline:

```text
Checkout
   ↓
Node.js setup
   ↓
npm install
   ↓
npm run build
```

### Backend CI

The backend pipeline:

```text
Checkout
   ↓
Java 21 setup
   ↓
PostgreSQL service
   ↓
Maven verify
   ↓
Tests
```

The backend CI environment runs PostgreSQL as a service container so that Spring Boot, Flyway, and the application tests can initialize against a real PostgreSQL instance.

---

# 🖼️ Screenshots

> Add screenshots/GIFs of the application here.

Recommended screenshots:

### Repository Explorer
Explore a GitHub repository and inspect its branches, commits, and Git structure.
![Repository Explorer](docs/images/repository-explorer.png)

```text
[ Add screenshot here ]
```

### Commit Graph

```text
[ Add screenshot here ]
```

### Object Graph

```text
[ Add screenshot here ]
```

### Commit / Diff Inspection

```text
[ Add screenshot here ]
```

A short screen recording/GIF demonstrating:

```text
Repository URL
      ↓
Explore
      ↓
Commit history
      ↓
Select commit
      ↓
Object graph
      ↓
Tree / blob inspection
```

would make the repository considerably stronger for recruiters.

---

# 💡 What This Project Demonstrates

Git Internals Explorer is intentionally more than a standard CRUD application.

The core engineering challenge is understanding and translating an existing distributed data model.

Instead of:

```text
Database
   ↓
CRUD endpoints
   ↓
Table UI
```

the project deals with:

```text
Git Repository
       │
       ├── References
       │
       └── Object Database
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
    Commit    Tree     Blob
       │       │
       ▼       ▼
    Parent   Tree
               │
               ▼
              Blob
```

The project therefore demonstrates experience with:

- REST API integration
- Spring Boot
- Java
- React
- TypeScript
- GitHub API integration
- JGit
- Git internals
- Directed graphs
- Tree data structures
- Recursive data transformation
- Object relationships
- DTO design
- API error handling
- Binary/text data handling
- Frontend/backend integration
- PostgreSQL
- Flyway
- Docker
- GitHub Actions
- Continuous integration

---

# 🏁 Current Status

### Implemented

- [x] GitHub repository URL parsing
- [x] Remote repository metadata retrieval
- [x] Branch/reference retrieval
- [x] Commit history
- [x] Commit metadata
- [x] Parent commit relationships
- [x] Commit graph visualization
- [x] Commit diff retrieval
- [x] Git object graph retrieval
- [x] Git tree representation
- [x] Blob retrieval
- [x] Text/binary blob detection
- [x] Repository tree exploration
- [x] Frontend/backend API integration
- [x] PostgreSQL infrastructure
- [x] Flyway integration
- [x] GitHub Actions CI

### In Progress / Future

- [ ] Complete local repository workflow in the frontend
- [ ] Unified repository abstraction for remote and local sources
- [ ] Deeper local JGit exploration
- [ ] More comprehensive automated tests
- [ ] Improved API error handling
- [ ] GitHub API caching/rate-limit handling
- [ ] More advanced object graph interactions
- [ ] Richer diff visualization
- [ ] Production deployment
- [ ] Improved documentation and interactive examples

---

# 🗺️ Roadmap

## Phase 1 — Repository Exploration

- GitHub repository discovery
- Branch/ref inspection
- Commit history
- Commit details
- Diff inspection

**Status: Implemented**

---

## Phase 2 — Git Object Exploration

- Commit → parent relationships
- Commit → tree relationships
- Tree → tree relationships
- Tree → blob relationships
- Blob inspection
- Object graph visualization

**Status: Implemented**

---

## Phase 3 — Local Repository Support

The backend already contains JGit-based repository functionality.

The next step is to expose that capability through a complete frontend workflow:

```text
Local repository path
        ↓
JGit
        ↓
Repository abstraction
        ↓
Same Git concepts
        ↓
Same visualization layer
```

The goal is eventually to let users switch between:

```text
┌───────────────────┐
│ Remote Repository │
│     GitHub API    │
└─────────┬─────────┘
          │
          ▼
    Repository Model
          ▲
          │
┌─────────┴─────────┐
│ Local Repository  │
│       JGit        │
└───────────────────┘
```

without duplicating the frontend's Git visualization logic.

---

## Phase 4 — Production Hardening

Future engineering improvements include:

- Structured exception handling
- Better validation
- Repository-level caching
- GitHub rate-limit awareness
- Expanded unit tests
- Integration tests
- Improved observability
- Production configuration
- Deployment automation

---

# 🔭 Long-Term Vision

The long-term goal is to make Git Internals Explorer an interactive environment for learning and debugging Git's internal model.

A developer should be able to start with something familiar:

```text
main
```

and progressively drill down:

```text
main
 ↓
Commit
 ↓
Parent Commit
 ↓
Tree
 ↓
Directory
 ↓
Blob
 ↓
File Contents
```

The application should make the relationship between Git's high-level commands and its underlying object database intuitive.

In short:

> **From `git log` to the Git object database.**

---

# 👩‍💻 Author

**Shreya Batham**

B.Tech Computer Science & Engineering

Git Internals Explorer is a hands-on exploration of Git's internal architecture combined with full-stack application development, REST API design, GitHub API integration, and interactive data visualization.

