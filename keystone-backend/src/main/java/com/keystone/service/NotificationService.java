package com.keystone.service;

import com.keystone.domain.entity.*;
import com.keystone.domain.enums.NotificationType;
import com.keystone.dto.response.NotificationResponse;
import com.keystone.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void notifyAssignment(WorkOrder wo) {
        if (wo.getAssignedTo() == null) return;
        createNotification(
            wo.getAssignedTo(), wo,
            NotificationType.WORK_ORDER_ASSIGNED,
            "Work Order Assigned: " + wo.getWoNumber(),
            "You have been assigned work order: " + wo.getTitle()
        );
    }

    public void notifyCompletion(WorkOrder wo) {
        createNotification(
            wo.getCreatedBy(), wo,
            NotificationType.WORK_ORDER_COMPLETED,
            "Work Order Completed: " + wo.getWoNumber(),
            "Work order '" + wo.getTitle() + "' has been completed"
        );
    }

    public void notifySLABreach(WorkOrder wo) {
        createNotification(
            wo.getCreatedBy(), wo,
            NotificationType.SLA_BREACHED,
            "SLA Breach: " + wo.getWoNumber(),
            "Work order '" + wo.getTitle() + "' has breached its SLA deadline"
        );
    }

    private void createNotification(User user, WorkOrder wo, NotificationType type,
                                    String title, String message) {
        Notification notification = Notification.builder()
            .user(user)
            .workOrder(wo)
            .type(type)
            .title(title)
            .message(message)
            .isRead(false)
            .build();
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
            .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.markAllReadForUser(userId);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
            .id(n.getId())
            .type(n.getType())
            .title(n.getTitle())
            .message(n.getMessage())
            .isRead(n.getIsRead())
            .workOrderId(n.getWorkOrder() != null ? n.getWorkOrder().getId() : null)
            .workOrderNumber(n.getWorkOrder() != null ? n.getWorkOrder().getWoNumber() : null)
            .createdAt(n.getCreatedAt())
            .build();
    }
}
