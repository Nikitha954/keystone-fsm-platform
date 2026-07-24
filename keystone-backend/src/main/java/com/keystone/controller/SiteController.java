package com.keystone.controller;

import com.keystone.dto.request.CreateSiteRequest;
import com.keystone.dto.response.ApiResponse;
import com.keystone.dto.response.SiteResponse;
import com.keystone.service.SiteService;
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
@RequestMapping("/api/v1/sites")
@RequiredArgsConstructor
@Tag(name = "Sites", description = "Site management")
public class SiteController {

    private final SiteService siteService;

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER')")
    @Operation(summary = "Create a new site")
    public ResponseEntity<ApiResponse<SiteResponse>> create(@Valid @RequestBody CreateSiteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Site created", siteService.createSite(request)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER')")
    @Operation(summary = "Get sites by customer (paginated)")
    public ResponseEntity<ApiResponse<Page<SiteResponse>>> getByCustomer(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(siteService.getSitesByCustomer(customerId, page, size)));
    }

    @GetMapping("/customer/{customerId}/all")
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER')")
    @Operation(summary = "Get all sites for a customer (no pagination, for dropdowns)")
    public ResponseEntity<ApiResponse<List<SiteResponse>>> getAllByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.success(siteService.getAllSitesByCustomer(customerId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER')")
    @Operation(summary = "Get site by ID")
    public ResponseEntity<ApiResponse<SiteResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(siteService.getSiteById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','DISPATCHER')")
    @Operation(summary = "Update a site")
    public ResponseEntity<ApiResponse<SiteResponse>> update(
            @PathVariable Long id, @Valid @RequestBody CreateSiteRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Site updated", siteService.updateSite(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(summary = "Soft-delete a site")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        siteService.deleteSite(id);
        return ResponseEntity.ok(ApiResponse.success("Site deactivated", null));
    }
}
