package com.keystone.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class LogPartUsageRequest {
    @NotNull private Long partId;
    @NotNull @Min(1) private Integer quantity;
    private String notes;
}
