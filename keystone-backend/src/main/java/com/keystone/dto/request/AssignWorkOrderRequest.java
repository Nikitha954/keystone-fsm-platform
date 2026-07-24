package com.keystone.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignWorkOrderRequest {
    @NotNull(message = "Technician ID is required")
    private Long technicianId;
}
