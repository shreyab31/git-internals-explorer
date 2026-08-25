package com.gitexplorer.api.dto;

public record BlobResponse(
        String objectId,
        int size,
        String content,
        boolean binary
) {
}