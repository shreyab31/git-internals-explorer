package com.gitexplorer.api.dto;

public record TreeEntryResponse(
        String name,
        String type,
        String objectId
) {
}