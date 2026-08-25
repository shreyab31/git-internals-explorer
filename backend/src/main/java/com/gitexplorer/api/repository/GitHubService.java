package com.gitexplorer.api.repository;
import com.gitexplorer.api.dto.BlobResponse;
import com.gitexplorer.api.dto.DiffEntryResponse;
import com.gitexplorer.api.dto.CommitResponse;
import com.gitexplorer.api.dto.RefResponse;
import com.gitexplorer.api.dto.ObjectGraphResponse;
import com.gitexplorer.api.dto.ObjectTreeResponse;
import com.gitexplorer.api.dto.ObjectTreeEntryResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
public class GitHubService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String githubToken;

    public GitHubService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
        this.githubToken = System.getenv("GITHUB_TOKEN");
    }

    public Map<String, String> openRepository(String url)
            throws Exception {

        RepositoryCoordinates repository =
                parseRepositoryUrl(url);

        String apiUrl =
                "https://api.github.com/repos/"
                        + repository.owner()
                        + "/"
                        + repository.name();

        JsonNode repositoryData =
                get(apiUrl);

        return Map.of(
                "path", url,
                "gitDirectory",
                repositoryData.path("full_name").asText()
        );
    }

    public List<RefResponse> getRefs(String url)
            throws Exception {

        RepositoryCoordinates repository =
                parseRepositoryUrl(url);

        String apiUrl =
                "https://api.github.com/repos/"
                        + repository.owner()
                        + "/"
                        + repository.name()
                        + "/branches?per_page=100";

        JsonNode branches =
                get(apiUrl);

        List<RefResponse> refs =
                new ArrayList<>();

        for (JsonNode branch : branches) {

            String name =
                    branch.path("name").asText();

            String target =
                    branch
                            .path("commit")
                            .path("sha")
                            .asText();

            refs.add(
                    new RefResponse(
                            name,
                            "BRANCH",
                            target
                    )
            );
        }

        return refs;
    }
    public List<CommitResponse> getCommitHistory(
            String url,
            String ref
    ) throws Exception {

        RepositoryCoordinates repository =
                parseRepositoryUrl(url);

        String apiUrl =
                "https://api.github.com/repos/"
                        + repository.owner()
                        + "/"
                        + repository.name()
                        + "/commits?sha="
                        + java.net.URLEncoder.encode(
                        ref,
                        java.nio.charset.StandardCharsets.UTF_8
                )
                        + "&per_page=100";

        JsonNode commits = get(apiUrl);

        List<CommitResponse> results =
                new ArrayList<>();

        for (JsonNode commitNode : commits) {

            String id =
                    commitNode.path("sha").asText();

            String message =
                    commitNode
                            .path("commit")
                            .path("message")
                            .asText();

            String shortId =
                    id.substring(0, 7);

            String author =
                    commitNode
                            .path("commit")
                            .path("author")
                            .path("name")
                            .asText("unknown");

            String authoredAt =
                    commitNode
                            .path("commit")
                            .path("author")
                            .path("date")
                            .asText();

            String committer =
                    commitNode
                            .path("commit")
                            .path("committer")
                            .path("name")
                            .asText("unknown");

            String committedAt =
                    commitNode
                            .path("commit")
                            .path("committer")
                            .path("date")
                            .asText();

            List<String> parentIds =
                    new ArrayList<>();

            for (JsonNode parent :
                    commitNode.path("parents")) {

                parentIds.add(
                        parent.path("sha").asText()
                );
            }

            results.add(
                    new CommitResponse(
                            id,
                            shortId,
                            message.split("\n", 2)[0],
                            author,
                            Instant.parse(authoredAt),
                            committer,
                            Instant.parse(committedAt),
                            parentIds,
                            List.of(ref)
                    )
            );
        }

        return results;
    }
    public List<DiffEntryResponse> getCommitDiff(
            String url,
            String commitId
    ) throws Exception {

        RepositoryCoordinates repository =
                parseRepositoryUrl(url);

        String apiUrl =
                "https://api.github.com/repos/"
                        + repository.owner()
                        + "/"
                        + repository.name()
                        + "/commits/"
                        + commitId;

        JsonNode commit = get(apiUrl);

        List<DiffEntryResponse> results =
                new ArrayList<>();

        for (JsonNode file : commit.path("files")) {

            String filename =
                    file.path("filename").asText();

            String status =
                    file.path("status").asText();

            int additions =
                    file.path("additions").asInt();

            int deletions =
                    file.path("deletions").asInt();

            String previousFilename =
                    file.path("previous_filename").asText("");

            String oldPath;
            String newPath;

            if ("renamed".equals(status)) {
                oldPath = previousFilename;
                newPath = filename;
            } else if ("deleted".equals(status)) {
                oldPath = filename;
                newPath = "";
            } else {
                oldPath = "";
                newPath = filename;
            }

            results.add(
                    new DiffEntryResponse(
                            oldPath,
                            newPath,
                            status.toUpperCase(),
                            additions,
                            deletions
                    )
            );
        }

        return results;
    }
    public ObjectGraphResponse getObjectGraph(
            String url,
            String commitId
    ) throws Exception {

        RepositoryCoordinates repository =
                parseRepositoryUrl(url);

        String commitApiUrl =
                "https://api.github.com/repos/"
                        + repository.owner()
                        + "/"
                        + repository.name()
                        + "/git/commits/"
                        + commitId;

        JsonNode commit =
                get(commitApiUrl);

        String treeId =
                commit
                        .path("tree")
                        .path("sha")
                        .asText();

        List<String> parentIds =
                new ArrayList<>();

        for (JsonNode parent :
                commit.path("parents")) {

            parentIds.add(
                    parent.path("sha").asText()
            );
        }

        String treeApiUrl =
                "https://api.github.com/repos/"
                        + repository.owner()
                        + "/"
                        + repository.name()
                        + "/git/trees/"
                        + treeId
                        + "?recursive=1";

        JsonNode treeData =
                get(treeApiUrl);

        ObjectTreeResponse tree =
                buildObjectTree(
                        treeId,
                        treeData.path("tree")
                );

        return new ObjectGraphResponse(
                commitId,
                parentIds,
                tree
        );
    }
    public BlobResponse getBlob(
            String url,
            String blobId
    ) throws Exception {

        RepositoryCoordinates repository =
                parseRepositoryUrl(url);

        String apiUrl =
                "https://api.github.com/repos/"
                        + repository.owner()
                        + "/"
                        + repository.name()
                        + "/git/blobs/"
                        + blobId;

        JsonNode blob =
                get(apiUrl);

        String encoding =
                blob.path("encoding").asText();

        int size =
                blob.path("size").asInt();

        String encodedContent =
                blob.path("content").asText();

        if (!"base64".equalsIgnoreCase(encoding)) {
            throw new IllegalArgumentException(
                    "GitHub returned an unsupported blob encoding."
            );
        }

        String cleanedContent =
                encodedContent.replaceAll("\\s+", "");

        byte[] decoded =
                Base64.getDecoder().decode(
                        cleanedContent
                );

        boolean binary =
                isBinary(decoded);

        String content =
                binary
                        ? ""
                        : new String(
                        decoded,
                        StandardCharsets.UTF_8
                );

        return new BlobResponse(
                blobId,
                size,
                content,
                binary
        );
    }
    private boolean isBinary(byte[] data) {

        int checkLength =
                Math.min(data.length, 8192);

        for (int i = 0; i < checkLength; i++) {

            if (data[i] == 0) {
                return true;
            }
        }

        return false;
    }
    private ObjectTreeResponse buildObjectTree(
            String treeId,
            JsonNode entries
    ) {

        MutableTreeNode root =
                new MutableTreeNode(
                        "",
                        "TREE",
                        treeId
                );

        for (JsonNode entry : entries) {

            String path =
                    entry.path("path").asText();

            String type =
                    mapObjectType(
                            entry.path("type").asText(),
                            entry.path("mode").asText()
                    );

            String objectId =
                    entry.path("sha").asText();

            addEntry(
                    root,
                    path,
                    type,
                    objectId
            );
        }

        return new ObjectTreeResponse(
                treeId,
                toResponseEntries(root.children)
        );
    }
    private void addEntry(
            MutableTreeNode root,
            String path,
            String type,
            String objectId
    ) {

        String[] parts =
                path.split("/");

        MutableTreeNode current =
                root;

        for (int i = 0; i < parts.length; i++) {

            String part =
                    parts[i];

            boolean last =
                    i == parts.length - 1;

            MutableTreeNode child =
                    current.children.get(part);

            if (child == null) {

                child =
                        new MutableTreeNode(
                                part,
                                last
                                        ? type
                                        : "TREE",
                                last
                                        ? objectId
                                        : ""
                        );

                current.children.put(
                        part,
                        child
                );
            }

            if (last) {

                child.type = type;
                child.id = objectId;
            }

            current = child;
        }
    }
    private List<ObjectTreeEntryResponse> toResponseEntries(
            Map<String, MutableTreeNode> nodes
    ) {

        List<ObjectTreeEntryResponse> result =
                new ArrayList<>();

        for (MutableTreeNode node :
                nodes.values()) {

            result.add(
                    new ObjectTreeEntryResponse(
                            node.name,
                            node.type,
                            node.id,
                            toResponseEntries(
                                    node.children
                            )
                    )
            );
        }

        return result;
    }
    private String mapObjectType(
            String githubType,
            String mode
    ) {

        if ("tree".equals(githubType)) {
            return "TREE";
        }

        if ("commit".equals(githubType)) {
            return "GITLINK";
        }

        if ("blob".equals(githubType)
                && "120000".equals(mode)) {
            return "SYMLINK";
        }

        if ("blob".equals(githubType)) {
            return "BLOB";
        }

        return "UNKNOWN";
    }

    private JsonNode get(String url) throws Exception {

        HttpRequest.Builder requestBuilder =
                HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header(
                                "Accept",
                                "application/vnd.github+json"
                        )
                        .header(
                                "X-GitHub-Api-Version",
                                "2022-11-28"
                        )
                        .header(
                                "User-Agent",
                                "Git-Internals-Explorer"
                        )
                        .GET();

        if (githubToken != null && !githubToken.isBlank()) {
            requestBuilder.header(
                    "Authorization",
                    "Bearer " + githubToken
            );
        }

        HttpRequest request = requestBuilder.build();

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

        if (response.statusCode() < 200
                || response.statusCode() >= 300) {

            throw new IllegalArgumentException(
                    "GitHub API request failed: HTTP "
                            + response.statusCode()
                            + " | "
                            + response.body()
                            + " | Remaining: "
                            + response.headers()
                            .firstValue("X-RateLimit-Remaining")
                            .orElse("unknown")
            );
        }

        return objectMapper.readTree(response.body());
    }

    private RepositoryCoordinates parseRepositoryUrl(
            String url) {

        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException(
                    "GitHub repository URL is required."
            );
        }

        String cleaned =
                url.trim()
                        .replaceAll("/+$", "");

        if (!cleaned.startsWith(
                "https://github.com/")) {

            throw new IllegalArgumentException(
                    "Enter a valid GitHub repository URL."
            );
        }

        String remainder =
                cleaned.substring(
                        "https://github.com/"
                                .length()
                );

        String[] parts =
                remainder.split("/");

        if (parts.length < 2
                || parts[0].isBlank()
                || parts[1].isBlank()) {

            throw new IllegalArgumentException(
                    "GitHub URL must look like " +
                            "https://github.com/owner/repository"
            );
        }

        String owner = parts[0];

        String name =
                parts[1]
                        .replaceAll(
                                "\\.git$",
                                ""
                        );

        return new RepositoryCoordinates(
                owner,
                name
        );
    }

    private record RepositoryCoordinates(
            String owner,
            String name
    ) {
    }
    private static class MutableTreeNode {

        String name;
        String type;
        String id;

        Map<String, MutableTreeNode> children =
                new LinkedHashMap<>();

        MutableTreeNode(
                String name,
                String type,
                String id
        ) {
            this.name = name;
            this.type = type;
            this.id = id;
        }
    }
}