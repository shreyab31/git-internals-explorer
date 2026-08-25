package com.gitexplorer.api.repository;

import org.springframework.web.bind.annotation.*;

import com.gitexplorer.api.dto.CommitResponse;
import com.gitexplorer.api.dto.TreeResponse;
import com.gitexplorer.api.dto.TreeEntryResponse;
import com.gitexplorer.api.dto.BlobResponse;
import com.gitexplorer.api.dto.RefResponse;
import com.gitexplorer.api.dto.DiffEntryResponse;
import com.gitexplorer.api.dto.ObjectGraphResponse;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/repositories")
public class RepositoryController {

    private final GitHubService gitHubService;

    public RepositoryController(
            GitHubService gitHubService
    ) {
        this.gitHubService = gitHubService;
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
            @RequestParam(defaultValue = "HEAD") String ref
    ) throws Exception {

        return gitHubService.getCommitHistory(
                path,
                ref
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
}
