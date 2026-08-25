package com.gitexplorer.api.dto;

import java.util.List;

public record ObjectTreeResponse(
        String id,
        List<ObjectTreeEntryResponse> entries
) {
}