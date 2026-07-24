package com.keystone.controller;

import com.keystone.domain.enums.WorkOrderStatus;
import com.keystone.dto.request.*;
import com.keystone.dto.response.ApiResponse;
import com.keystone.dto.response.WorkOrderResponse;
import com.keystone.service.WorkOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workorders")
@RequiredArgsConstructor
@Tag(name = "Work Orders", description = "Work order lifecycle management")
public class WorkOrderController {

    private final WorkOrderService workOrderService;

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER','CUSTOMER')")
    @Operation(summary = "Create a new work order")
    public ResponseEntity<ApiResponse<WorkOrderResponse>> create(
            @Valid @RequestBody CreateWorkOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Work order created", workOrderService.createWorkOrder(request)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER')")
    @Operation(summary = "Search and filter work orders")
    public ResponseEntity<ApiResponse<Page<WorkOrderResponse>>> getAll(
            @RequestParam(required = false) WorkOrderStatus status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                workOrderService.getWorkOrders(status, customerId, assignedToId, search, page, size)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('TECHNICIAN','CUSTOMER')")
    @Operation(summary = "Get work orders assigned to the current technician")
    public ResponseEntity<ApiResponse<Page<WorkOrderResponse>>> getMyWorkOrders(
            @RequestParam(required = false) WorkOrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(workOrderService.getMyWorkOrders(status, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get full work order details including history")
    public ResponseEntity<ApiResponse<WorkOrderResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(workOrderService.getWorkOrderById(id)));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER')")
    @Operation(summary = "Assign a technician to a work order")
    public ResponseEntity<ApiResponse<WorkOrderResponse>> assign(
            @PathVariable Long id, @Valid @RequestBody AssignWorkOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Work order assigned", workOrderService.assignWorkOrder(id, request)));
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Transition work order status (enforces state machine)")
    public ResponseEntity<ApiResponse<WorkOrderResponse>> updateStatus(
            @PathVariable Long id, @Valid @RequestBody UpdateWorkOrderStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Status updated", workOrderService.updateStatus(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Delete a NEW or CANCELLED work order")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        workOrderService.deleteWorkOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Work order deleted", null));
    }
}
