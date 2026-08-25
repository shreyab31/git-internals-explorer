package com.gitexplorer.api.dto;

public record DiffEntryResponse(
        String oldPath,
        String newPath,
        String changeType,
        int additions,
        int deletions
) {
}