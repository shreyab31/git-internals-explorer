package com.gitexplorer.api.dto;

import java.util.List;

public record ObjectGraphResponse(
        String commitId,
        List<String> parentIds,
        ObjectTreeResponse tree
) {
}