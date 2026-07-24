package com.keystone.service;

import com.keystone.domain.enums.RoleName;
import com.keystone.domain.enums.WorkOrderPriority;
import com.keystone.domain.enums.WorkOrderStatus;
import com.keystone.dto.response.DashboardResponse;
import com.keystone.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final WorkOrderRepository workOrderRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PartRepository partRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getManagerDashboard() {
        return DashboardResponse.builder()
            .totalWorkOrders(workOrderRepository.count())
            .newWorkOrders(workOrderRepository.countByStatus(WorkOrderStatus.NEW))
            .assignedWorkOrders(workOrderRepository.countByStatus(WorkOrderStatus.ASSIGNED))
            .inProgressWorkOrders(workOrderRepository.countByStatus(WorkOrderStatus.IN_PROGRESS))
            .onHoldWorkOrders(workOrderRepository.countByStatus(WorkOrderStatus.ON_HOLD))
            .completedWorkOrders(workOrderRepository.countByStatus(WorkOrderStatus.COMPLETED))
            .closedWorkOrders(workOrderRepository.countByStatus(WorkOrderStatus.CLOSED))
            .cancelledWorkOrders(workOrderRepository.countByStatus(WorkOrderStatus.CANCELLED))
            .slaBreachedCount(workOrderRepository.countSlaBreached(Instant.now()))
            .totalCustomers(customerRepository.count())
            .totalTechnicians(userRepository.findAllByRoleName(RoleName.ROLE_TECHNICIAN).size())
            .lowStockPartsCount(partRepository.findLowStockParts().size())
            .workOrdersByPriority(Map.of(
                "LOW", 0L,
                "MEDIUM", 0L,
                "HIGH", 0L,
                "CRITICAL", 0L
            ))
            .build();
    }

    @Transactional(readOnly = true)
    public DashboardResponse getTechnicianDashboard(Long technicianId) {
        long active = workOrderRepository.countActiveByTechnician(technicianId);
        long completed = workOrderRepository.findByAssignedToIdAndStatus(
            technicianId, WorkOrderStatus.COMPLETED,
            org.springframework.data.domain.PageRequest.of(0, 1)).getTotalElements();

        return DashboardResponse.builder()
            .inProgressWorkOrders(active)
            .completedWorkOrders(completed)
            .build();
    }
}
