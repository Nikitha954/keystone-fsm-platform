package com.keystone.controller;

import com.keystone.dto.request.CreatePartRequest;
import com.keystone.dto.request.LogPartUsageRequest;
import com.keystone.dto.response.ApiResponse;
import com.keystone.dto.response.PartResponse;
import com.keystone.service.PartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/parts")
@RequiredArgsConstructor
@Tag(name = "Parts & Inventory", description = "Parts and stock management")
public class PartController {

    private final PartService partService;

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Create a new part")
    public ResponseEntity<ApiResponse<PartResponse>> create(@Valid @RequestBody CreatePartRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Part created", partService.createPart(request)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all active parts")
    public ResponseEntity<ApiResponse<Page<PartResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(partService.getParts(page, size)));
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER')")
    @Operation(summary = "Get parts with stock at or below minimum level")
    public ResponseEntity<ApiResponse<List<PartResponse>>> getLowStock() {
        return ResponseEntity.ok(ApiResponse.success(partService.getLowStockParts()));
    }

    @PostMapping("/workorder/{workOrderId}/usage")
    @PreAuthorize("hasRole('TECHNICIAN')")
    @Operation(summary = "Log part usage for a work order (auto-deducts stock)")
    public ResponseEntity<ApiResponse<Void>> logUsage(
            @PathVariable Long workOrderId, @Valid @RequestBody LogPartUsageRequest request) {
        partService.logPartUsage(workOrderId, request);
        return ResponseEntity.ok(ApiResponse.success("Part usage logged and stock updated", null));
    }

    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Adjust stock quantity (positive = restock, negative = adjustment)")
    public ResponseEntity<ApiResponse<PartResponse>> adjustStock(
            @PathVariable Long id, @RequestParam int quantity) {
        return ResponseEntity.ok(ApiResponse.success("Stock adjusted", partService.adjustStock(id, quantity)));
    }
}
