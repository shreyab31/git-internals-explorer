package com.gitexplorer.api.dto;

public record RefResponse(
        String name,
        String type,
        String target
) {
}