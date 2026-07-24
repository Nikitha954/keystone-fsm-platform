package com.keystone.controller;

import com.keystone.dto.request.LogTimeRequest;
import com.keystone.dto.response.ApiResponse;
import com.keystone.service.TimeLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/timelogs")
@RequiredArgsConstructor
@Tag(name = "Time Logs", description = "Technician time tracking")
public class TimeLogController {

    private final TimeLogService timeLogService;

    @PostMapping("/workorder/{workOrderId}")
    @PreAuthorize("hasRole('TECHNICIAN')")
    @Operation(summary = "Log time spent on a work order")
    public ResponseEntity<ApiResponse<Void>> logTime(
            @PathVariable Long workOrderId, @Valid @RequestBody LogTimeRequest request) {
        timeLogService.logTime(workOrderId, request);
        return ResponseEntity.ok(ApiResponse.success("Time logged successfully", null));
    }
}
