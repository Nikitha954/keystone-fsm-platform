package com.keystone.dto.response;

import com.keystone.domain.enums.WorkOrderPriority;
import com.keystone.domain.enums.WorkOrderStatus;
import lombok.*;
import java.time.Instant;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkOrderResponse {
    private Long id;
    private String woNumber;
    private String title;
    private String description;
    private WorkOrderPriority priority;
    private WorkOrderStatus status;
    private Long siteId;
    private String siteName;
    private Long customerId;
    private String customerName;
    private Long assignedToId;
    private String assignedToName;
    private Long createdById;
    private String createdByName;
    private Instant dueDate;
    private Instant slaDueDate;
    private Instant startedAt;
    private Instant completedAt;
    private Instant closedAt;
    private Instant createdAt;
    private Instant updatedAt;
    private boolean slaBreach;
    private List<StatusHistoryResponse> statusHistory;
    private Integer totalTimeMinutes;
}
