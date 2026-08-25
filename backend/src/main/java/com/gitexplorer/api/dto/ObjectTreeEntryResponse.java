package com.gitexplorer.api.dto;

import java.util.List;

public record ObjectTreeEntryResponse(
        String name,
        String type,
        String id,
        List<ObjectTreeEntryResponse> children
) {
}