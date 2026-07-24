package com.keystone.service;

import com.keystone.domain.entity.*;
import com.keystone.domain.enums.*;
import com.keystone.dto.request.*;
import com.keystone.dto.response.*;
import com.keystone.exception.*;
import com.keystone.repository.*;
import com.keystone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderStatusHistoryRepository statusHistoryRepository;
    private final SiteRepository siteRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final TimeLogRepository timeLogRepository;
    private final SecurityUtils securityUtils;
    private final NotificationService notificationService;

    // Thread-safe sequence counter for WO numbers
    private static final AtomicLong sequence = new AtomicLong(0);

    @Transactional
    public WorkOrderResponse createWorkOrder(CreateWorkOrderRequest request) {
        Site site = siteRepository.findById(request.getSiteId())
            .orElseThrow(() -> new ResourceNotFoundException("Site", request.getSiteId()));
        Customer customer = customerRepository.findById(request.getCustomerId())
            .orElseThrow(() -> new ResourceNotFoundException("Customer", request.getCustomerId()));
        User currentUser = securityUtils.getCurrentUser();

        WorkOrder wo = WorkOrder.builder()
            .woNumber(generateWoNumber())
            .title(request.getTitle())
            .description(request.getDescription())
            .priority(request.getPriority() != null ? request.getPriority() : WorkOrderPriority.MEDIUM)
            .status(WorkOrderStatus.NEW)
            .site(site)
            .customer(customer)
            .createdBy(currentUser)
            .dueDate(request.getDueDate())
            .slaDueDate(calculateSlaDueDate(request.getPriority()))
            .build();

        // If technician is provided at creation, assign immediately
        if (request.getAssignedToId() != null) {
            User technician = userRepository.findById(request.getAssignedToId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getAssignedToId()));
            wo.setAssignedTo(technician);
            wo.setStatus(WorkOrderStatus.ASSIGNED);
        }

        WorkOrder saved = workOrderRepository.save(wo);

        // Record initial status in history
        recordStatusHistory(saved, null, saved.getStatus(), currentUser, "Work order created");

        // Notify technician if assigned
        if (saved.getAssignedTo() != null) {
            notificationService.notifyAssignment(saved);
        }

        log.info("Created work order: {}", saved.getWoNumber());
        return toResponse(saved);
    }

    @Transactional
    public WorkOrderResponse assignWorkOrder(Long workOrderId, AssignWorkOrderRequest request) {
        WorkOrder wo = findById(workOrderId);
        User technician = userRepository.findById(request.getTechnicianId())
            .orElseThrow(() -> new ResourceNotFoundException("User", request.getTechnicianId()));

        if (!technician.hasRole("ROLE_TECHNICIAN")) {
            throw new BusinessRuleViolationException("User is not a technician");
        }

        WorkOrderStatus oldStatus = wo.getStatus();

        // From NEW → ASSIGNED, or re-assign an already ASSIGNED order
        if (wo.getStatus() == WorkOrderStatus.NEW) {
            wo.setStatus(WorkOrderStatus.ASSIGNED);
        } else if (wo.getStatus() != WorkOrderStatus.ASSIGNED) {
            throw new InvalidStatusTransitionException(wo.getStatus().name(), "ASSIGNED");
        }

        wo.setAssignedTo(technician);
        WorkOrder saved = workOrderRepository.save(wo);

        if (oldStatus != WorkOrderStatus.ASSIGNED) {
            recordStatusHistory(saved, oldStatus, WorkOrderStatus.ASSIGNED,
                securityUtils.getCurrentUser(), "Assigned to " + technician.getFullName());
        }

        notificationService.notifyAssignment(saved);
        log.info("Assigned WO {} to technician {}", saved.getWoNumber(), technician.getFullName());
        return toResponse(saved);
    }

    @Transactional
    public WorkOrderResponse updateStatus(Long workOrderId, UpdateWorkOrderStatusRequest request) {
        WorkOrder wo = findById(workOrderId);
        WorkOrderStatus newStatus = request.getStatus();
        WorkOrderStatus oldStatus = wo.getStatus();

        // Enforce state machine
        if (!wo.canTransitionTo(newStatus)) {
            throw new InvalidStatusTransitionException(oldStatus.name(), newStatus.name());
        }

        User currentUser = securityUtils.getCurrentUser();

        // Technicians can only move their own work orders
        if (currentUser.hasRole("ROLE_TECHNICIAN") &&
            (wo.getAssignedTo() == null || !wo.getAssignedTo().getId().equals(currentUser.getId()))) {
            throw new UnauthorizedOperationException("You can only update your own work orders");
        }

        // Set timestamps based on new status
        Instant now = Instant.now();
        switch (newStatus) {
            case IN_PROGRESS -> { if (wo.getStartedAt() == null) wo.setStartedAt(now); }
            case COMPLETED   -> wo.setCompletedAt(now);
            case CLOSED      -> wo.setClosedAt(now);
            default          -> {}
        }

        wo.setStatus(newStatus);
        WorkOrder saved = workOrderRepository.save(wo);
        recordStatusHistory(saved, oldStatus, newStatus, currentUser, request.getReason());

        // Notify relevant parties
        if (newStatus == WorkOrderStatus.COMPLETED) {
            notificationService.notifyCompletion(saved);
        }

        log.info("WO {} status changed: {} → {}", saved.getWoNumber(), oldStatus, newStatus);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> getWorkOrders(WorkOrderStatus status, Long customerId,
                                                  Long assignedToId, String search,
                                                  int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return workOrderRepository.searchWorkOrders(status, customerId, assignedToId,
            search != null ? search : "", pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public WorkOrderResponse getWorkOrderById(Long id) {
        WorkOrder wo = findById(id);
        WorkOrderResponse response = toResponse(wo);
        // Load status history for detail view
        List<StatusHistoryResponse> history = statusHistoryRepository
            .findByWorkOrderIdOrderByChangedAtDesc(id)
            .stream().map(this::toHistoryResponse).collect(Collectors.toList());
        response.setStatusHistory(history);
        response.setTotalTimeMinutes(timeLogRepository.sumDurationByWorkOrder(id));
        return response;
    }

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> getMyWorkOrders(WorkOrderStatus status, int page, int size) {
        Long techId = securityUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (status != null) {
            return workOrderRepository.findByAssignedToIdAndStatus(techId, status, pageable).map(this::toResponse);
        }
        return workOrderRepository.findByAssignedToId(techId, pageable).map(this::toResponse);
    }

    @Transactional
    public void deleteWorkOrder(Long id) {
        WorkOrder wo = findById(id);
        if (wo.getStatus() != WorkOrderStatus.NEW && wo.getStatus() != WorkOrderStatus.CANCELLED) {
            throw new BusinessRuleViolationException(
                "Only NEW or CANCELLED work orders can be deleted");
        }
        workOrderRepository.delete(wo);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private WorkOrder findById(Long id) {
        return workOrderRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("WorkOrder", id));
    }

    private String generateWoNumber() {
        String year = String.valueOf(java.time.Year.now().getValue());
        String seq = String.format("%05d", sequence.incrementAndGet() % 100000);
        String candidate = "WO-" + year + "-" + seq;
        // Ensure uniqueness (handles restarts)
        while (workOrderRepository.existsByWoNumber(candidate)) {
            seq = String.format("%05d", sequence.incrementAndGet() % 100000);
            candidate = "WO-" + year + "-" + seq;
        }
        return candidate;
    }

    private Instant calculateSlaDueDate(WorkOrderPriority priority) {
        if (priority == null) priority = WorkOrderPriority.MEDIUM;
        int hours = switch (priority) {
            case CRITICAL -> 4;
            case HIGH     -> 8;
            case MEDIUM   -> 24;
            case LOW      -> 72;
        };
        return Instant.now().plus(hours, ChronoUnit.HOURS);
    }

    private void recordStatusHistory(WorkOrder wo, WorkOrderStatus oldStatus,
                                     WorkOrderStatus newStatus, User changedBy, String reason) {
        WorkOrderStatusHistory history = WorkOrderStatusHistory.builder()
            .workOrder(wo)
            .oldStatus(oldStatus)
            .newStatus(newStatus)
            .changedBy(changedBy)
            .changeReason(reason)
            .build();
        statusHistoryRepository.save(history);
    }

    public WorkOrderResponse toResponse(WorkOrder wo) {
        boolean slaBreach = wo.getSlaDueDate() != null
            && Instant.now().isAfter(wo.getSlaDueDate())
            && wo.getStatus() != WorkOrderStatus.COMPLETED
            && wo.getStatus() != WorkOrderStatus.CLOSED
            && wo.getStatus() != WorkOrderStatus.CANCELLED;

        return WorkOrderResponse.builder()
            .id(wo.getId())
            .woNumber(wo.getWoNumber())
            .title(wo.getTitle())
            .description(wo.getDescription())
            .priority(wo.getPriority())
            .status(wo.getStatus())
            .siteId(wo.getSite().getId())
            .siteName(wo.getSite().getName())
            .customerId(wo.getCustomer().getId())
            .customerName(wo.getCustomer().getName())
            .assignedToId(wo.getAssignedTo() != null ? wo.getAssignedTo().getId() : null)
            .assignedToName(wo.getAssignedTo() != null ? wo.getAssignedTo().getFullName() : null)
            .createdById(wo.getCreatedBy().getId())
            .createdByName(wo.getCreatedBy().getFullName())
            .dueDate(wo.getDueDate())
            .slaDueDate(wo.getSlaDueDate())
            .startedAt(wo.getStartedAt())
            .completedAt(wo.getCompletedAt())
            .closedAt(wo.getClosedAt())
            .createdAt(wo.getCreatedAt())
            .updatedAt(wo.getUpdatedAt())
            .slaBreach(slaBreach)
            .build();
    }

    private StatusHistoryResponse toHistoryResponse(WorkOrderStatusHistory h) {
        return StatusHistoryResponse.builder()
            .id(h.getId())
            .oldStatus(h.getOldStatus())
            .newStatus(h.getNewStatus())
            .changedByName(h.getChangedBy().getFullName())
            .changeReason(h.getChangeReason())
            .changedAt(h.getChangedAt())
            .build();
    }
}
