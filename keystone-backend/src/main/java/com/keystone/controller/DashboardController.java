package com.keystone.controller;

import com.keystone.dto.response.ApiResponse;
import com.keystone.dto.response.DashboardResponse;
import com.keystone.security.SecurityUtils;
import com.keystone.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Role-based dashboard data")
public class DashboardController {

    private final DashboardService dashboardService;
    private final SecurityUtils securityUtils;

    @GetMapping("/manager")
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER')")
    @Operation(summary = "Manager/Dispatcher overview dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> getManagerDashboard() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getManagerDashboard()));
    }

    @GetMapping("/technician")
    @PreAuthorize("hasRole('TECHNICIAN')")
    @Operation(summary = "Technician personal dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> getTechnicianDashboard() {
        Long techId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getTechnicianDashboard(techId)));
    }
}
