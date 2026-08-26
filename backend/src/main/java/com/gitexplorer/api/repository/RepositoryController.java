package com.gitexplorer.api.repository;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gitexplorer.api.dto.BlobResponse;
import com.gitexplorer.api.dto.CommitResponse;
import com.gitexplorer.api.dto.DiffEntryResponse;
import com.gitexplorer.api.dto.ObjectGraphResponse;
import com.gitexplorer.api.dto.RefResponse;
import com.gitexplorer.api.dto.TreeEntryResponse;
import com.gitexplorer.api.dto.TreeResponse;

@RestController
@RequestMapping("/api/repositories")
public class RepositoryController {

    private final GitHubService gitHubService;
    private final RepositoryService repositoryService;

    public RepositoryController(
            GitHubService gitHubService,
            RepositoryService repositoryService
    ) {
        this.gitHubService = gitHubService;
        this.repositoryService = repositoryService;
    }

    @PostMapping("/open")
    public Map<String, String> openRepository(
            @RequestParam String path
    ) throws Exception {
        return gitHubService.openRepository(path);
    }

    @GetMapping("/refs")
    public List<RefResponse> getRefs(
            @RequestParam String path
    ) throws Exception {
        return gitHubService.getRefs(path);
    }

    @GetMapping("/commits")
    public List<CommitResponse> getCommitHistory(
            @RequestParam String path,
            @RequestParam(defaultValue = "HEAD") String ref,
            @RequestParam(defaultValue = "30") int limit
    ) throws Exception {
        return gitHubService.getCommitHistory(
                path,
                ref,
                limit
        );
    }

    @GetMapping("/commits/{commitId}/diff")
    public List<DiffEntryResponse> getCommitDiff(
            @PathVariable String commitId,
            @RequestParam String path
    ) throws Exception {
        return gitHubService.getCommitDiff(
                path,
                commitId
        );
    }

    @GetMapping("/commits/{commitId}/objects")
    public ObjectGraphResponse getObjectGraph(
            @PathVariable String commitId,
            @RequestParam String path
    ) throws Exception {
        return gitHubService.getObjectGraph(
                path,
                commitId
        );
    }

    @GetMapping("/blobs/{blobId}")
    public BlobResponse getBlob(
            @PathVariable String blobId,
            @RequestParam String path
    ) throws Exception {
        return gitHubService.getBlob(
                path,
                blobId
        );
    }

    @GetMapping("/commits/{commitId}/tree")
    public TreeResponse getCommitTree(
            @PathVariable String commitId,
            @RequestParam String path
    ) throws Exception {
        return repositoryService.getCommitTree(path, commitId);
    }

    @GetMapping("/trees/{treeId}")
    public List<TreeEntryResponse> getTreeEntries(
            @PathVariable String treeId,
            @RequestParam String path
    ) throws Exception {
        return repositoryService.getTreeEntries(path, treeId);
    }
}
