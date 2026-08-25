import type {
    BlobData,
    Commit,
    DiffEntry,
    Ref,
    RepositoryInfo,
    TreeEntry,
} from "../types/git";

function createPathParams(path: string) {
    return new URLSearchParams({ path });
}

async function requireResponse(
    response: Response,
    errorMessage: string
): Promise<Response> {
    if (!response.ok) {
        throw new Error(errorMessage);
    }

    return response;
}

export async function openRepository(
    path: string
): Promise<RepositoryInfo> {
    const params = createPathParams(path);

    const response = await fetch(
        `/api/repositories/open?${params.toString()}`,
        {
            method: "POST",
        }
    );

    await requireResponse(
        response,
        "Could not open repository."
    );

    return response.json();
}

export async function getCommits(
    path: string,
    ref = "HEAD",
    limit = 30
): Promise<Commit[]> {
    const params = new URLSearchParams({
        path,
        ref,
        limit: String(limit),
    });

    const response = await fetch(
        `/api/repositories/commits?${params.toString()}`
    );

    await requireResponse(
        response,
        "Could not load repository commits."
    );

    return response.json();
}
export async function getCommitDiff(
    path: string,
    commitId: string
): Promise<DiffEntry[]> {
    const params = createPathParams(path);

    const response = await fetch(
        `/api/repositories/commits/${commitId}/diff?${params.toString()}`
    );

    await requireResponse(
        response,
        "Could not load commit changes."
    );

    return response.json();
}

export async function getRefs(
    path: string
): Promise<Ref[]> {
    const params = createPathParams(path);

    const response = await fetch(
        `/api/repositories/refs?${params.toString()}`
    );

    await requireResponse(
        response,
        "Could not load repository references."
    );

    return response.json();
}

export async function getCommitTree(
  path: string,
  commitId: string
): Promise<{ commitId: string; treeId: string }> {
  const params = createPathParams(path);

  const response = await fetch(
    `/api/repositories/commits/${commitId}/tree?${params.toString()}`
  );

  await requireResponse(
    response,
    "Could not load commit tree."
  );

  return response.json();
}

export async function getTreeEntries(
  path: string,
  treeId: string
): Promise<TreeEntry[]> {
  const params = createPathParams(path);

  const response = await fetch(
    `/api/repositories/trees/${treeId}?${params.toString()}`
  );

  await requireResponse(
    response,
    "Could not load tree entries."
  );

  return response.json();
}

export async function getBlob(
  path: string,
  blobId: string
): Promise<BlobData> {
  const params = createPathParams(path);

  const response = await fetch(
    `/api/repositories/blobs/${blobId}?${params.toString()}`
  );

  await requireResponse(
    response,
    "Could not load file."
  );

  return response.json();
}
export type ObjectTreeEntry = {
  name: string;
  type: "TREE" | "BLOB" | "SYMLINK" | "GITLINK" | "UNKNOWN";
  id: string;
  children: ObjectTreeEntry[];
};

export type ObjectTree = {
  id: string;
  entries: ObjectTreeEntry[];
};

export type ObjectGraph = {
  commitId: string;
  parentIds: string[];
  tree: ObjectTree;
};

export async function getObjectGraph(
  path: string,
  commitId: string
): Promise<ObjectGraph> {
  const params = new URLSearchParams({ path });

  const response = await fetch(
    `/api/repositories/commits/${commitId}/objects?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Could not load Git object graph.");
  }

  return response.json();
}