package com.keystone.service;

import com.keystone.domain.entity.*;
import com.keystone.domain.enums.WorkOrderStatus;
import com.keystone.dto.request.LogTimeRequest;
import com.keystone.exception.*;
import com.keystone.repository.*;
import com.keystone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class TimeLogService {

    private final TimeLogRepository timeLogRepository;
    private final WorkOrderRepository workOrderRepository;
    private final SecurityUtils securityUtils;

    @Transactional
    public TimeLog logTime(Long workOrderId, LogTimeRequest request) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
            .orElseThrow(() -> new ResourceNotFoundException("WorkOrder", workOrderId));

        if (wo.getStatus() != WorkOrderStatus.IN_PROGRESS) {
            throw new BusinessRuleViolationException(
                "Can only log time for IN_PROGRESS work orders");
        }

        User technician = securityUtils.getCurrentUser();
        if (!technician.hasRole("ROLE_TECHNICIAN")) {
            throw new UnauthorizedOperationException("Only technicians can log time");
        }

        Integer durationMinutes = null;
        if (request.getEndTime() != null) {
            durationMinutes = (int) Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();
        }

        TimeLog timeLog = TimeLog.builder()
            .workOrder(wo)
            .technician(technician)
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .durationMinutes(durationMinutes)
            .notes(request.getNotes())
            .build();

        return timeLogRepository.save(timeLog);
    }
}
