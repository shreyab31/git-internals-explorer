export type Commit = {
    id: string;
    shortId: string;
    message: string;
    author: string;
    authoredAt: string;
    committer: string;
    committedAt: string;
    parentIds: string[];
    branches: string[];
};
export type Ref = {
  name: string;
  type: string;
  target: string | null;
};

export type DiffEntry = {
  oldPath: string;
  newPath: string;
  changeType: string;
  additions: number;
  deletions: number;
  patch: string | null;
};

export type RepositoryInfo = {
  path: string;
  gitDirectory: string;
  defaultBranch: string;
};

export type TreeEntry = {
  name: string;
  type: "TREE" | "BLOB" | "SYMLINK" | "GITLINK" | "UNKNOWN";
  objectId: string;
};

export type BlobData = {
  objectId: string;
  size: number;
  content: string;
  binary: boolean;
};