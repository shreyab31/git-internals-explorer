package com.gitexplorer.api.repository;

import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.springframework.stereotype.Service;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.lib.ObjectId;
import com.gitexplorer.api.dto.CommitResponse;
import com.gitexplorer.api.dto.TreeResponse;
import org.eclipse.jgit.lib.FileMode;
import com.gitexplorer.api.dto.RefResponse;
import org.eclipse.jgit.diff.RawTextComparator;
import org.eclipse.jgit.diff.Edit;
import org.eclipse.jgit.diff.EditList;
import org.eclipse.jgit.diff.RawText;
import java.util.ArrayList;
import java.util.List;
import java.io.File;
import java.util.Map;
import com.gitexplorer.api.dto.TreeEntryResponse;
import org.eclipse.jgit.treewalk.TreeWalk;
import com.gitexplorer.api.dto.BlobResponse;
import org.eclipse.jgit.lib.ObjectLoader;
import com.gitexplorer.api.dto.DiffEntryResponse;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.treewalk.CanonicalTreeParser;
import org.eclipse.jgit.lib.ObjectReader;
import org.eclipse.jgit.util.io.DisabledOutputStream;
import com.gitexplorer.api.dto.ObjectGraphResponse;
import com.gitexplorer.api.dto.ObjectTreeEntryResponse;
import com.gitexplorer.api.dto.ObjectTreeResponse;

@Service
public class RepositoryService {

    public Map<String, String> openRepository(String path) throws Exception {

        try (Repository repository = new FileRepositoryBuilder()
                .setGitDir(new File(path, ".git"))
                .readEnvironment()
                .build()) {

            return Map.of(
                    "path", repository.getDirectory().getParent(),
                    "gitDirectory", repository.getDirectory().getAbsolutePath()
            );
        }
    }

    public String getHeadCommitId(String path) throws Exception {

        Repository repository = new FileRepositoryBuilder()
                .setGitDir(new File(path, ".git"))
                .readEnvironment()
                .build();

        return repository.resolve("HEAD").getName();
    }

    public List<CommitResponse> getCommitHistory(
            String path,
            String ref
    ) throws Exception {

        try (Repository repository = new FileRepositoryBuilder()
                .setGitDir(new File(path, ".git"))
                .readEnvironment()
                .build()) {

            ObjectId startId = repository.resolve(ref);

            if (startId == null) {
                return List.of();
            }

            // Find which branches point directly to which commits.
            Map<String, List<String>> branchesByCommit = new java.util.HashMap<>();

            for (var refUpdate : repository.getRefDatabase().getRefs()) {

                String refName = refUpdate.getName();

                if (refName.startsWith("refs/heads/")
                        && refUpdate.getObjectId() != null) {

                    String branchName =
                            refName.substring("refs/heads/".length());

                    String commitId =
                            refUpdate.getObjectId().getName();

                    branchesByCommit
                            .computeIfAbsent(
                                    commitId,
                                    key -> new ArrayList<>()
                            )
                            .add(branchName);
                }
            }

            try (RevWalk walk = new RevWalk(repository)) {

                RevCommit startCommit =
                        walk.parseCommit(startId);

                walk.markStart(startCommit);

                List<CommitResponse> commits =
                        new ArrayList<>();

                for (RevCommit commit : walk) {

                    List<String> parentIds =
                            new ArrayList<>();

                    for (RevCommit parent : commit.getParents()) {
                        parentIds.add(parent.getName());
                    }

                    List<String> branches =
                            branchesByCommit.getOrDefault(
                                    commit.getName(),
                                    List.of()
                            );

                    commits.add(
                            new CommitResponse(
                                    commit.getName(),
                                    commit.getName().substring(0, 7),
                                    commit.getShortMessage(),
                                    commit.getAuthorIdent().getName(),
                                    commit.getAuthorIdent()
                                            .getWhen()
                                            .toInstant(),
                                    commit.getCommitterIdent().getName(),
                                    commit.getCommitterIdent()
                                            .getWhen()
                                            .toInstant(),
                                    parentIds,
                                    branches
                            )
                    );
                }

                return commits;
            }
        }
    }
    public TreeResponse getCommitTree(String path, String commitId) throws Exception {

        try (Repository repository = new FileRepositoryBuilder()
                .setGitDir(new File(path, ".git"))
                .readEnvironment()
                .build()) {

            ObjectId objectId = repository.resolve(commitId);

            if (objectId == null) {
                throw new IllegalArgumentException("Commit not found: " + commitId);
            }

            try (RevWalk walk = new RevWalk(repository)) {

                RevCommit commit = walk.parseCommit(objectId);

                return new TreeResponse(
                        commit.getName(),
                        commit.getTree().getId().getName()
                );
            }
        }
    }

    public List<TreeEntryResponse> getTreeEntries(
            String path,
            String treeId
    ) throws Exception {

        try (Repository repository = new FileRepositoryBuilder()
                .setGitDir(new File(path, ".git"))
                .readEnvironment()
                .build()) {

            ObjectId objectId = repository.resolve(treeId);

            if (objectId == null) {
                throw new IllegalArgumentException(
                        "Tree not found: " + treeId
                );
            }

            List<TreeEntryResponse> entries = new ArrayList<>();

            try (TreeWalk treeWalk = new TreeWalk(repository)) {

                treeWalk.addTree(objectId);
                treeWalk.setRecursive(false);

                while (treeWalk.next()) {

                    FileMode fileMode = treeWalk.getFileMode(0);

                    String type;

                    if (fileMode.equals(FileMode.TREE)) {
                        type = "TREE";
                    } else if (fileMode.equals(FileMode.REGULAR_FILE)
                            || fileMode.equals(FileMode.EXECUTABLE_FILE)) {
                        type = "BLOB";
                    } else if (fileMode.equals(FileMode.SYMLINK)) {
                        type = "SYMLINK";
                    } else if (fileMode.equals(FileMode.GITLINK)) {
                        type = "GITLINK";
                    } else {
                        type = "UNKNOWN";
                    }

                    entries.add(new TreeEntryResponse(
                            treeWalk.getPathString(),
                            type,
                            treeWalk.getObjectId(0).getName()
                    ));
                }
            }

            return entries;
        }
    }

    public BlobResponse getBlob(String path, String blobId) throws Exception {

        try (Repository repository = new FileRepositoryBuilder()
                .setGitDir(new File(path, ".git"))
                .readEnvironment()
                .build()) {

            ObjectId objectId = repository.resolve(blobId);

            if (objectId == null) {
                throw new IllegalArgumentException(
                        "Blob not found: " + blobId
                );
            }

            ObjectLoader loader = repository.open(objectId);

            byte[] bytes = loader.getBytes();

            boolean binary = isBinary(bytes);

            String content = binary
                    ? ""
                    : new String(bytes, java.nio.charset.StandardCharsets.UTF_8);

            return new BlobResponse(
                    blobId,
                    bytes.length,
                    content,
                    binary
            );
        }
    }

    public List<RefResponse> getRefs(String path) throws Exception {

        try (Repository repository = new FileRepositoryBuilder()
                .setGitDir(new File(path, ".git"))
                .readEnvironment()
                .build()) {

            List<RefResponse> refs = new ArrayList<>();

            for (var ref : repository.getRefDatabase().getRefs()) {

                String refName = ref.getName();

                if (refName.startsWith("refs/heads/")) {

                    String branchName =
                            refName.substring("refs/heads/".length());

                    String target = ref.getObjectId() == null
                            ? null
                            : ref.getObjectId().getName();

                    refs.add(new RefResponse(
                            branchName,
                            "BRANCH",
                            target
                    ));
                }
            }

            return refs;
        }
    }

    public List<DiffEntryResponse> getCommitDiff(
            String path,
            String commitId
    ) throws Exception {

        try (Repository repository = new FileRepositoryBuilder()
                .setGitDir(new File(path, ".git"))
                .readEnvironment()
                .build()) {

            ObjectId commitObjectId = repository.resolve(commitId);

            if (commitObjectId == null) {
                throw new IllegalArgumentException(
                        "Commit not found: " + commitId
                );
            }

            try (RevWalk walk = new RevWalk(repository)) {

                RevCommit commit = walk.parseCommit(commitObjectId);

                if (commit.getParentCount() == 0) {
                    return List.of();
                }

                RevCommit parent = walk.parseCommit(commit.getParent(0));

                try (ObjectReader reader = repository.newObjectReader();
                     DiffFormatter formatter =
                             new DiffFormatter(DisabledOutputStream.INSTANCE)) {

                    CanonicalTreeParser oldTree = new CanonicalTreeParser();
                    oldTree.reset(reader, parent.getTree());

                    CanonicalTreeParser newTree = new CanonicalTreeParser();
                    newTree.reset(reader, commit.getTree());

                    formatter.setRepository(repository);
                    formatter.setDiffComparator(RawTextComparator.DEFAULT);
                    formatter.setDetectRenames(true);

                    List<DiffEntry> diffs =
                            formatter.scan(oldTree, newTree);

                    List<DiffEntryResponse> results = new ArrayList<>();

                    for (DiffEntry diff : diffs) {

                        ObjectLoader oldLoader = null;
                        ObjectLoader newLoader = null;

                        if (diff.getOldId() != null
                                && !diff.getOldId().toObjectId()
                                .equals(ObjectId.zeroId())) {

                            oldLoader = repository.open(
                                    diff.getOldId().toObjectId()
                            );
                        }

                        if (diff.getNewId() != null
                                && !diff.getNewId().toObjectId()
                                .equals(ObjectId.zeroId())) {

                            newLoader = repository.open(
                                    diff.getNewId().toObjectId()
                            );
                        }

                        int additions = 0;
                        int deletions = 0;

                        if (oldLoader != null && newLoader != null) {

                            RawText oldText =
                                    new RawText(oldLoader.getBytes());

                            RawText newText =
                                    new RawText(newLoader.getBytes());

                            EditList editList =
                                    new org.eclipse.jgit.diff.HistogramDiff()
                                            .diff(
                                                    RawTextComparator.DEFAULT,
                                                    oldText,
                                                    newText
                                            );

                            for (Edit edit : editList) {

                                additions +=
                                        edit.getEndB() - edit.getBeginB();

                                deletions +=
                                        edit.getEndA() - edit.getBeginA();
                            }

                        } else if (oldLoader == null
                                && newLoader != null) {

                            RawText newText =
                                    new RawText(newLoader.getBytes());

                            additions = newText.size();

                        } else if (oldLoader != null) {

                            RawText oldText =
                                    new RawText(oldLoader.getBytes());

                            deletions = oldText.size();
                        }

                        results.add(new DiffEntryResponse(
                                diff.getOldPath(),
                                diff.getNewPath(),
                                diff.getChangeType().name(),
                                additions,
                                deletions
                        ));
                    }

                    return results;
                }
            }
        }
    }

    private boolean isBinary(byte[] bytes) {

        int checkLength = Math.min(bytes.length, 8000);

        for (int i = 0; i < checkLength; i++) {
            if (bytes[i] == 0) {
                return true;
            }
        }

        return false;
    }

    public ObjectGraphResponse getObjectGraph(
            String path,
            String commitId
    ) throws Exception {

        try (Repository repository = new FileRepositoryBuilder()
                .setGitDir(new File(path, ".git"))
                .readEnvironment()
                .build()) {

            ObjectId objectId = repository.resolve(commitId);

            if (objectId == null) {
                throw new IllegalArgumentException(
                        "Commit not found: " + commitId
                );
            }

            try (RevWalk walk = new RevWalk(repository)) {

                RevCommit commit = walk.parseCommit(objectId);

                List<String> parentIds = new ArrayList<>();

                for (RevCommit parent : commit.getParents()) {
                    parentIds.add(parent.getName());
                }

                ObjectId treeObjectId = commit.getTree().getId();

                ObjectTreeResponse tree =
                        buildObjectTree(repository, treeObjectId);

                return new ObjectGraphResponse(
                        commit.getName(),
                        parentIds,
                        tree
                );
            }
        }
    }
    private ObjectTreeResponse buildObjectTree(
            Repository repository,
            ObjectId treeId
    ) throws Exception {

        List<ObjectTreeEntryResponse> entries = new ArrayList<>();

        try (TreeWalk treeWalk = new TreeWalk(repository)) {

            treeWalk.addTree(treeId);
            treeWalk.setRecursive(false);

            while (treeWalk.next()) {

                FileMode fileMode = treeWalk.getFileMode(0);

                String type;

                if (fileMode.equals(FileMode.TREE)) {
                    type = "TREE";
                } else if (
                        fileMode.equals(FileMode.REGULAR_FILE)
                                || fileMode.equals(FileMode.EXECUTABLE_FILE)
                ) {
                    type = "BLOB";
                } else if (fileMode.equals(FileMode.SYMLINK)) {
                    type = "SYMLINK";
                } else if (fileMode.equals(FileMode.GITLINK)) {
                    type = "GITLINK";
                } else {
                    type = "UNKNOWN";
                }

                ObjectId entryId = treeWalk.getObjectId(0);

                List<ObjectTreeEntryResponse> children =
                        type.equals("TREE")
                                ? buildObjectTree(repository, entryId).entries()
                                : List.of();

                entries.add(
                        new ObjectTreeEntryResponse(
                                treeWalk.getPathString(),
                                type,
                                entryId.getName(),
                                children
                        )
                );
            }
        }

        return new ObjectTreeResponse(
                treeId.getName(),
                entries
        );
    }
}