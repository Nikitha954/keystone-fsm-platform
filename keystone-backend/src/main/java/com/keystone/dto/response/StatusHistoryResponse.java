package com.keystone.dto.response;

import com.keystone.domain.enums.WorkOrderStatus;
import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class StatusHistoryResponse {
    private Long id;
    private WorkOrderStatus oldStatus;
    private WorkOrderStatus newStatus;
    private String changedByName;
    private String changeReason;
    private Instant changedAt;
}
