package com.keystone.dto.request;

import com.keystone.domain.enums.WorkOrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateWorkOrderStatusRequest {
    @NotNull(message = "Status is required")
    private WorkOrderStatus status;
    private String reason;
}
