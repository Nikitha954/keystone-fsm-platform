package com.keystone.dto.response;

import com.keystone.domain.enums.NotificationType;
import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private Boolean isRead;
    private Long workOrderId;
    private String workOrderNumber;
    private Instant createdAt;
}
