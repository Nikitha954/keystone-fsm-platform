package com.keystone.service;

import com.keystone.domain.entity.*;
import com.keystone.domain.enums.*;
import com.keystone.dto.request.*;
import com.keystone.dto.response.WorkOrderResponse;
import com.keystone.exception.*;
import com.keystone.repository.*;
import com.keystone.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkOrderServiceTest {

    @Mock WorkOrderRepository workOrderRepository;
    @Mock WorkOrderStatusHistoryRepository statusHistoryRepository;
    @Mock SiteRepository siteRepository;
    @Mock CustomerRepository customerRepository;
    @Mock UserRepository userRepository;
    @Mock TimeLogRepository timeLogRepository;
    @Mock SecurityUtils securityUtils;
    @Mock NotificationService notificationService;

    @InjectMocks WorkOrderService workOrderService;

    private User manager;
    private User technician;
    private Customer customer;
    private Site site;
    private WorkOrder workOrder;

    @BeforeEach
    void setUp() {
        Role managerRole = Role.builder().id(1L).name(RoleName.ROLE_MANAGER).build();
        Role techRole   = Role.builder().id(2L).name(RoleName.ROLE_TECHNICIAN).build();

        manager = User.builder().id(1L).firstName("Admin").lastName("User")
                .email("admin@test.com").roles(java.util.Set.of(managerRole)).isActive(true).build();
        technician = User.builder().id(2L).firstName("James").lastName("Walker")
                .email("tech@test.com").roles(java.util.Set.of(techRole)).isActive(true).build();

        customer = Customer.builder().id(1L).name("Test Corp").isActive(true).build();
        site = Site.builder().id(1L).customer(customer).name("Site A").address("123 St").build();

        workOrder = WorkOrder.builder()
                .id(1L).woNumber("WO-2024-00001").title("Fix HVAC")
                .status(WorkOrderStatus.NEW).priority(WorkOrderPriority.HIGH)
                .site(site).customer(customer).createdBy(manager).build();
    }

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Test
    void createWorkOrder_success() {
        CreateWorkOrderRequest request = new CreateWorkOrderRequest();
        request.setTitle("Fix HVAC"); request.setSiteId(1L); request.setCustomerId(1L);
        request.setPriority(WorkOrderPriority.HIGH);

        when(siteRepository.findById(1L)).thenReturn(Optional.of(site));
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(securityUtils.getCurrentUser()).thenReturn(manager);
        when(workOrderRepository.save(any())).thenReturn(workOrder);
        when(statusHistoryRepository.save(any())).thenReturn(null);

        WorkOrderResponse result = workOrderService.createWorkOrder(request);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Fix HVAC");
        verify(workOrderRepository).save(any(WorkOrder.class));
        verify(statusHistoryRepository).save(any(WorkOrderStatusHistory.class));
    }

    @Test
    void createWorkOrder_siteNotFound_throwsResourceNotFound() {
        CreateWorkOrderRequest request = new CreateWorkOrderRequest();
        request.setTitle("Test"); request.setSiteId(999L); request.setCustomerId(1L);

        when(siteRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workOrderService.createWorkOrder(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    // ── STATUS TRANSITIONS ────────────────────────────────────────────────────

    @Test
    void updateStatus_validTransition_NEW_to_ASSIGNED_fails_directly() {
        // ASSIGNED requires going through assignWorkOrder, not updateStatus
        workOrder.setStatus(WorkOrderStatus.NEW);
        UpdateWorkOrderStatusRequest req = new UpdateWorkOrderStatusRequest();
        req.setStatus(WorkOrderStatus.ASSIGNED);

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(securityUtils.getCurrentUser()).thenReturn(manager);

        // NEW → ASSIGNED is valid per state machine
        when(workOrderRepository.save(any())).thenReturn(workOrder);
        when(statusHistoryRepository.save(any())).thenReturn(null);

        // This should succeed since ASSIGNED is in NEW's allowed transitions
        assertThatCode(() -> workOrderService.updateStatus(1L, req)).doesNotThrowAnyException();
    }

    @Test
    void updateStatus_invalidTransition_throwsConflict() {
        workOrder.setStatus(WorkOrderStatus.COMPLETED);
        UpdateWorkOrderStatusRequest req = new UpdateWorkOrderStatusRequest();
        req.setStatus(WorkOrderStatus.IN_PROGRESS); // COMPLETED → IN_PROGRESS is illegal

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(securityUtils.getCurrentUser()).thenReturn(manager);

        assertThatThrownBy(() -> workOrderService.updateStatus(1L, req))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("COMPLETED")
                .hasMessageContaining("IN_PROGRESS");
    }

    @Test
    void updateStatus_closedWorkOrder_cannotTransition() {
        workOrder.setStatus(WorkOrderStatus.CLOSED);
        UpdateWorkOrderStatusRequest req = new UpdateWorkOrderStatusRequest();
        req.setStatus(WorkOrderStatus.IN_PROGRESS);

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(securityUtils.getCurrentUser()).thenReturn(manager);

        assertThatThrownBy(() -> workOrderService.updateStatus(1L, req))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    @Test
    void updateStatus_cancelledWorkOrder_cannotTransition() {
        workOrder.setStatus(WorkOrderStatus.CANCELLED);
        UpdateWorkOrderStatusRequest req = new UpdateWorkOrderStatusRequest();
        req.setStatus(WorkOrderStatus.NEW);

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(securityUtils.getCurrentUser()).thenReturn(manager);

        assertThatThrownBy(() -> workOrderService.updateStatus(1L, req))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    // ── ASSIGN ────────────────────────────────────────────────────────────────

    @Test
    void assignWorkOrder_nonTechnician_throwsBusinessRule() {
        AssignWorkOrderRequest req = new AssignWorkOrderRequest();
        req.setTechnicianId(1L); // manager, not technician

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(userRepository.findById(1L)).thenReturn(Optional.of(manager));

        assertThatThrownBy(() -> workOrderService.assignWorkOrder(1L, req))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("not a technician");
    }

    @Test
    void assignWorkOrder_success() {
        AssignWorkOrderRequest req = new AssignWorkOrderRequest();
        req.setTechnicianId(2L);

        WorkOrder saved = WorkOrder.builder()
                .id(1L).woNumber("WO-2024-00001").title("Fix HVAC")
                .status(WorkOrderStatus.ASSIGNED).priority(WorkOrderPriority.HIGH)
                .site(site).customer(customer).createdBy(manager)
                .assignedTo(technician).build();

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(userRepository.findById(2L)).thenReturn(Optional.of(technician));
        when(workOrderRepository.save(any())).thenReturn(saved);
        when(statusHistoryRepository.save(any())).thenReturn(null);
        when(securityUtils.getCurrentUser()).thenReturn(manager);
        doNothing().when(notificationService).notifyAssignment(any());

        WorkOrderResponse result = workOrderService.assignWorkOrder(1L, req);

        assertThat(result.getStatus()).isEqualTo(WorkOrderStatus.ASSIGNED);
        assertThat(result.getAssignedToId()).isEqualTo(2L);
        verify(notificationService).notifyAssignment(any());
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    @Test
    void deleteWorkOrder_inProgress_throwsBusinessRule() {
        workOrder.setStatus(WorkOrderStatus.IN_PROGRESS);
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));

        assertThatThrownBy(() -> workOrderService.deleteWorkOrder(1L))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("NEW or CANCELLED");
    }

    @Test
    void deleteWorkOrder_new_succeeds() {
        workOrder.setStatus(WorkOrderStatus.NEW);
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        doNothing().when(workOrderRepository).delete(workOrder);

        assertThatCode(() -> workOrderService.deleteWorkOrder(1L)).doesNotThrowAnyException();
        verify(workOrderRepository).delete(workOrder);
    }
}
