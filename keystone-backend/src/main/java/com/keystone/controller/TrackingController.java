package com.keystone.controller;

import com.keystone.dto.request.LocationUpdateRequest;
import com.keystone.dto.response.ApiResponse;
import com.keystone.dto.response.LocationResponse;
import com.keystone.dto.response.RouteOptimizationResponse;
import com.keystone.service.TrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tracking")
@RequiredArgsConstructor
@Tag(name = "Tracking & Route Optimization", description = "Live GPS technician locations and route optimization")
public class TrackingController {

    private final TrackingService trackingService;

    @PostMapping("/location")
    @Operation(summary = "Record technician GPS position")
    public ResponseEntity<LocationResponse> updateLocation(@Valid @RequestBody LocationUpdateRequest req) {
        return ResponseEntity.ok(
                trackingService.saveLocation(req.getUserId(), req.getLatitude(),
                        req.getLongitude(), req.getHeading(), req.getSpeed()));
    }

    @GetMapping("/technician/{id}/latest")
    @Operation(summary = "Get latest coordinates for specific technician")
    public ResponseEntity<LocationResponse> latestForTechnician(@PathVariable Long id) {
        LocationResponse resp = trackingService.getLatestForUser(id);
        return resp == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(resp);
    }

    /** All technicians' latest positions for the live map. */
    @GetMapping("/all-latest")
    @Operation(summary = "Get all active technicians latest coordinates")
    public ResponseEntity<List<LocationResponse>> allLatest() {
        return ResponseEntity.ok(trackingService.getAllLatest());
    }

    /** Nearest technicians to a job-site coordinate. */
    @GetMapping("/nearest")
    @Operation(summary = "Find nearest technicians to coordinates")
    public ResponseEntity<List<LocationResponse>> nearest(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(trackingService.findNearest(lat, lng, limit));
    }

    /** Route Optimization: Computes optimal daily route sequence minimizing fuel and travel time */
    @GetMapping("/route/{technicianId}")
    @Operation(summary = "Calculate optimized daily route for technician")
    public ResponseEntity<ApiResponse<RouteOptimizationResponse>> getOptimizedRoute(@PathVariable Long technicianId) {
        RouteOptimizationResponse route = trackingService.optimizeRouteForTechnician(technicianId);
        return ResponseEntity.ok(ApiResponse.success(route));
    }

    /** Trigger live simulated drive along route for demo */
    @PostMapping("/simulate/{technicianId}")
    @Operation(summary = "Simulate live vehicle drive along route")
    public ResponseEntity<ApiResponse<String>> simulateDrive(@PathVariable Long technicianId) {
        trackingService.simulateDrive(technicianId);
        return ResponseEntity.ok(ApiResponse.success("Simulation started along route", "OK"));
    }
}
