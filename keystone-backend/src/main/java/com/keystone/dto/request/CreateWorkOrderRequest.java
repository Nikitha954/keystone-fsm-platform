package com.keystone.dto.request;

import com.keystone.domain.enums.WorkOrderPriority;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.Instant;

@Data
public class CreateWorkOrderRequest {
    @NotBlank @Size(max = 500)
    private String title;

    private String description;

    private WorkOrderPriority priority = WorkOrderPriority.MEDIUM;

    @NotNull(message = "Site ID is required")
    private Long siteId;

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    private Long assignedToId;

    private Instant dueDate;
}
