package com.keystone.service;

import com.keystone.domain.entity.*;
import com.keystone.domain.enums.NotificationType;
import com.keystone.dto.response.NotificationResponse;
import com.keystone.repository.NotificationRepository;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@keystone.com}")
    private String fromEmail;

    @Value("${twilio.from-number:}")
    private String twilioFromNumber;

    @Value("${twilio.account-sid:}")
    private String twilioAccountSid;

    // ── In-app notifications ──────────────────────────────────────────────────

    public void notifyAssignment(WorkOrder wo) {
        if (wo.getAssignedTo() == null) return;
        String msg = "You have been assigned work order: " + wo.getTitle();
        createNotification(wo.getAssignedTo(), wo, NotificationType.WORK_ORDER_ASSIGNED,
                "Work Order Assigned: " + wo.getWoNumber(), msg);
        sendEmailAsync(wo.getAssignedTo().getEmail(), "Work Order Assigned: " + wo.getWoNumber(), msg);
        sendSmsAsync(wo.getAssignedTo().getPhone(), msg);
    }

    public void notifyCompletion(WorkOrder wo) {
        String msg = "Work order '" + wo.getTitle() + "' has been completed";
        createNotification(wo.getCreatedBy(), wo, NotificationType.WORK_ORDER_COMPLETED,
                "Work Order Completed: " + wo.getWoNumber(), msg);
        sendEmailAsync(wo.getCreatedBy().getEmail(), "Work Order Completed: " + wo.getWoNumber(), msg);

        if (wo.getCustomer() != null) {
            String custMsg = "Your service call " + wo.getWoNumber() + " is completed! Please take a moment to rate your technician's service.";
            sendSmsAsync(wo.getCustomer().getPhone(), custMsg);
            sendEmailAsync(wo.getCustomer().getEmail(), "Service Completed – Rate Your Experience: " + wo.getWoNumber(), custMsg);
        }
    }

    public void notifySLABreach(WorkOrder wo) {
        String msg = "Work order '" + wo.getTitle() + "' has breached its SLA deadline";
        createNotification(wo.getCreatedBy(), wo, NotificationType.SLA_BREACHED,
                "SLA Breach: " + wo.getWoNumber(), msg);
        sendEmailAsync(wo.getCreatedBy().getEmail(), "SLA Breach: " + wo.getWoNumber(), msg);
    }

    public void notifyTechnicianEta(WorkOrder wo, int etaMinutes) {
        if (wo.getCustomer() == null) return;
        String msg = "Your technician is approximately " + etaMinutes + " minutes away for work order: " + wo.getWoNumber();
        // SMS to customer contact (stored on customer entity phone field)
        sendSmsAsync(wo.getCustomer().getPhone(), msg);
        sendEmailAsync(wo.getCustomer().getEmail(), "Technician En Route – " + wo.getWoNumber(), msg);
    }

    public void notifyLowStock(User manager, Part part) {
        String msg = "Part '" + part.getName() + "' (" + part.getPartNumber() + ") is low on stock: "
                + part.getStockQty() + " remaining (min: " + part.getMinStock() + ")";
        createNotification(manager, null, NotificationType.PART_LOW_STOCK, "Low Stock Alert", msg);
        sendEmailAsync(manager.getEmail(), "Low Stock Alert: " + part.getName(), msg);
    }

    // ── Async email ───────────────────────────────────────────────────────────

    @Async
    public void sendEmailAsync(String to, String subject, String body) {
        if (to == null || to.isBlank()) return;
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.debug("Email sent to {}: {}", to, subject);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    // ── Async SMS ─────────────────────────────────────────────────────────────

    @Async
    public void sendSmsAsync(String toPhone, String body) {
        if (toPhone == null || toPhone.isBlank() || twilioFromNumber.isBlank() || twilioAccountSid.isBlank()) return;
        try {
            Message.creator(new PhoneNumber(toPhone), new PhoneNumber(twilioFromNumber), body).create();
            log.debug("SMS sent to {}", toPhone);
        } catch (Exception e) {
            log.warn("Failed to send SMS to {}: {}", toPhone, e.getMessage());
        }
    }

    // ── In-app helpers ────────────────────────────────────────────────────────

    private void createNotification(User user, WorkOrder wo, NotificationType type,
                                    String title, String message) {
        Notification notification = Notification.builder()
                .user(user).workOrder(wo).type(type)
                .title(title).message(message).isRead(false)
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
                .id(n.getId()).type(n.getType()).title(n.getTitle())
                .message(n.getMessage()).isRead(n.getIsRead())
                .workOrderId(n.getWorkOrder() != null ? n.getWorkOrder().getId() : null)
                .workOrderNumber(n.getWorkOrder() != null ? n.getWorkOrder().getWoNumber() : null)
                .createdAt(n.getCreatedAt())
                .build();
    }
}
