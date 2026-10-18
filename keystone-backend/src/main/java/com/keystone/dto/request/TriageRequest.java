package com.keystone.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TriageRequest {
    @NotNull
    private Long workOrderId;

    private String text;
}
