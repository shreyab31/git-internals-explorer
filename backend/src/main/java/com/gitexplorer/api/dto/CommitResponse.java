package com.gitexplorer.api.dto;

import java.time.Instant;
import java.util.List;

public record CommitResponse(
        String id,
        String shortId,
        String message,
        String author,
        Instant authoredAt,
        String committer,
        Instant committedAt,
        List<String> parentIds,
        List<String> branches
) {
}