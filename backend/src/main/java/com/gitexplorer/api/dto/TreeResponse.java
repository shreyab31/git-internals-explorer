package com.gitexplorer.api.dto;

public record TreeResponse(
        String commitId,
        String treeId
) {
}