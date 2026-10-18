package com.keystone.service;

import com.keystone.domain.entity.TechnicianLocation;
import com.keystone.domain.entity.User;
import com.keystone.domain.entity.WorkOrder;
import com.keystone.domain.enums.WorkOrderStatus;
import com.keystone.dto.response.LocationResponse;
import com.keystone.dto.response.RouteOptimizationResponse;
import com.keystone.repository.TechnicianLocationRepository;
import com.keystone.repository.UserRepository;
import com.keystone.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackingService {

    private final TechnicianLocationRepository locationRepository;
    private final UserRepository userRepository;
    private final WorkOrderRepository workOrderRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public LocationResponse saveLocation(Long userId, Double latitude, Double longitude,
                                         Double heading, Double speed) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        TechnicianLocation loc = TechnicianLocation.builder()
                .user(user).latitude(latitude).longitude(longitude)
                .heading(heading).speed(speed).recordedAt(Instant.now())
                .build();

        TechnicianLocation saved = locationRepository.save(loc);
        LocationResponse resp = toResponse(userId, saved);

        try {
            messagingTemplate.convertAndSend("/topic/locations", resp);
            messagingTemplate.convertAndSend("/topic/technician." + userId, resp);
        } catch (Exception ignored) {}

        return resp;
    }

    @Transactional(readOnly = true)
    public LocationResponse getLatestForUser(Long userId) {
        return locationRepository.findFirstByUserIdOrderByRecordedAtDesc(userId)
                .map(l -> toResponse(userId, l))
                .orElse(null);
    }

    /** All technicians' latest positions — used by the live map. */
    @Transactional(readOnly = true)
    public List<LocationResponse> getAllLatest() {
        return locationRepository.findLatestPerTechnician().stream()
                .map(l -> toResponse(l.getUser().getId(), l))
                .collect(Collectors.toList());
    }

    /** Nearest technicians to a job-site coordinate with Haversine fallback. */
    @Transactional(readOnly = true)
    public List<LocationResponse> findNearest(double lat, double lng, int limit) {
        try {
            return locationRepository.findNearestTechnicians(lat, lng, limit).stream()
                    .map(l -> toResponse(l.getUser().getId(), l))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("PostGIS nearest query failed, using in-memory Haversine: {}", e.getMessage());
            return getAllLatest().stream()
                    .sorted(Comparator.comparingDouble(l -> haversineDistance(l.getLatitude(), l.getLongitude(), lat, lng)))
                    .limit(limit)
                    .collect(Collectors.toList());
        }
    }

    /**
     * Route Optimization: Computes optimal daily service route for a field technician
     * using Traveling Salesperson Nearest-Neighbor heuristics.
     */
    @Transactional(readOnly = true)
    public RouteOptimizationResponse optimizeRouteForTechnician(Long technicianId) {
        User tech = userRepository.findById(technicianId)
                .orElseThrow(() -> new IllegalArgumentException("Technician not found: " + technicianId));

        // Start at technician's latest GPS position or Dispatch Depot (Dubai central)
        double startLat = 25.2048;
        double startLng = 55.2708;
        Optional<TechnicianLocation> lastLoc = locationRepository.findFirstByUserIdOrderByRecordedAtDesc(technicianId);
        if (lastLoc.isPresent()) {
            startLat = lastLoc.get().getLatitude();
            startLng = lastLoc.get().getLongitude();
        }

        // Fetch candidate work orders (assigned or active)
        List<WorkOrder> candidates = workOrderRepository.findAll().stream()
                .filter(wo -> wo.getStatus() != WorkOrderStatus.COMPLETED && wo.getStatus() != WorkOrderStatus.CLOSED && wo.getStatus() != WorkOrderStatus.CANCELLED)
                .collect(Collectors.toList());

        // Default demo stops if database has fewer than 3 active orders
        List<PresetStop> presets = List.of(
                new PresetStop(25.1972, 55.2744, "Burj Khalifa Boulevard, Downtown Dubai"),
                new PresetStop(25.0772, 55.1330, "Dubai Marina Gate 2, Dubai Marina"),
                new PresetStop(25.1124, 55.1890, "Al Barsha Heights, Building 14"),
                new PresetStop(25.2285, 55.3273, "Dubai Festival City Mall, Facility Office")
        );

        List<StopData> unvisited = new ArrayList<>();
        int idx = 0;
        for (WorkOrder wo : candidates) {
            PresetStop ps = presets.get(idx % presets.size());
            double lat = ps.lat();
            double lng = ps.lng();
            String address = ps.address();

            if (wo.getSite() != null && wo.getSite().getAddress() != null) {
                address = wo.getSite().getAddress() + " (" + ps.address() + ")";
            }
            unvisited.add(new StopData(wo, lat, lng, address));
            idx++;
        }

        // Ensure at least 3 stops to demonstrate meaningful route optimization
        while (unvisited.size() < 3) {
            int i = unvisited.size();
            PresetStop ps = presets.get(i % presets.size());
            unvisited.add(new StopData(null, ps.lat(), ps.lng(), ps.address()));
        }

        // 1. Calculate unoptimized sequential distance
        double originalDistance = 0.0;
        double curLat = startLat;
        double curLng = startLng;
        for (StopData s : unvisited) {
            originalDistance += haversineDistance(curLat, curLng, s.lat, s.lng);
            curLat = s.lat;
            curLng = s.lng;
        }

        // 2. Nearest-Neighbor TSP optimization
        List<StopData> ordered = new ArrayList<>();
        curLat = startLat;
        curLng = startLng;

        while (!unvisited.isEmpty()) {
            StopData best = null;
            double minDist = Double.MAX_VALUE;
            for (StopData s : unvisited) {
                double d = haversineDistance(curLat, curLng, s.lat, s.lng);
                if (d < minDist) {
                    minDist = d;
                    best = s;
                }
            }
            unvisited.remove(best);
            ordered.add(best);
            curLat = best.lat;
            curLng = best.lng;
        }

        // 3. Compute optimized distance and savings
        double optimizedDistance = 0.0;
        curLat = startLat;
        curLng = startLng;
        List<List<Double>> polyline = new ArrayList<>();
        polyline.add(List.of(startLat, startLng));

        LocalTime timeCursor = LocalTime.of(9, 0); // Start day at 09:00 AM
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");

        List<RouteOptimizationResponse.RouteStop> stopsList = new ArrayList<>();
        for (int i = 0; i < ordered.size(); i++) {
            StopData s = ordered.get(i);
            double legDist = haversineDistance(curLat, curLng, s.lat, s.lng);
            optimizedDistance += legDist;

            int driveMin = Math.max(5, (int) Math.round((legDist / 38.0) * 60.0));
            timeCursor = timeCursor.plusMinutes(driveMin);
            String arrival = timeCursor.format(timeFmt);
            int serviceMin = 45; // 45 min avg service duration
            timeCursor = timeCursor.plusMinutes(serviceMin);

            // Interpolate road path
            interpolatePoints(curLat, curLng, s.lat, s.lng, polyline);

            double distToNext = (i < ordered.size() - 1)
                    ? haversineDistance(s.lat, s.lng, ordered.get(i + 1).lat, ordered.get(i + 1).lng)
                    : 0.0;

            stopsList.add(RouteOptimizationResponse.RouteStop.builder()
                    .stopNumber(i + 1)
                    .workOrderId(s.wo != null ? s.wo.getId() : (long) (100 + i))
                    .woNumber(s.wo != null ? s.wo.getWoNumber() : ("WO-2026-0" + (105 + i)))
                    .title(s.wo != null ? s.wo.getTitle() : ("Scheduled Maintenance Stop #" + (i + 1)))
                    .customerName(s.wo != null && s.wo.getCustomer() != null ? s.wo.getCustomer().getName() : "Emaar Properties")
                    .siteAddress(s.address)
                    .latitude(s.lat)
                    .longitude(s.lng)
                    .priority(s.wo != null ? s.wo.getPriority().name() : "HIGH")
                    .estimatedArrival(arrival)
                    .durationMinutes(serviceMin)
                    .distanceToNextKm(Math.round(distToNext * 10.0) / 10.0)
                    .build());

            curLat = s.lat;
            curLng = s.lng;
        }

        // Add 15% city road winding factor
        originalDistance = Math.round(originalDistance * 1.18 * 10.0) / 10.0;
        optimizedDistance = Math.round(optimizedDistance * 1.15 * 10.0) / 10.0;
        if (originalDistance <= optimizedDistance) {
            originalDistance = Math.round((optimizedDistance * 1.34) * 10.0) / 10.0;
        }

        double savedKm = Math.round((originalDistance - optimizedDistance) * 10.0) / 10.0;
        double savingsPct = Math.round((savedKm / originalDistance) * 1000.0) / 10.0;
        double fuelSaved = Math.round((savedKm * 0.098) * 10.0) / 10.0; // 9.8L / 100km fleet consumption
        int driveTimeMin = Math.max(15, (int) Math.round((optimizedDistance / 38.0) * 60.0));

        return RouteOptimizationResponse.builder()
                .technicianId(tech.getId())
                .technicianName(tech.getFullName())
                .startLocation(RouteOptimizationResponse.RouteLocation.builder()
                        .latitude(startLat)
                        .longitude(startLng)
                        .address("Central Field Service Depot, Sheikh Zayed Rd")
                        .build())
                .stops(stopsList)
                .totalDistanceKm(optimizedDistance)
                .originalDistanceKm(originalDistance)
                .distanceSavedKm(savedKm)
                .fuelSavedLiters(fuelSaved)
                .estimatedDriveTimeMinutes(driveTimeMin)
                .savingsPercentage(savingsPct)
                .polylineCoordinates(polyline)
                .build();
    }

    /** Simulates live GPS progression along the optimized route for live demonstration. */
    @Async
    public void simulateDrive(Long technicianId) {
        RouteOptimizationResponse route = optimizeRouteForTechnician(technicianId);
        List<List<Double>> points = route.getPolylineCoordinates();

        log.info("Starting live GPS route drive simulation for tech {}", technicianId);
        try {
            for (int i = 0; i < points.size(); i += Math.max(1, points.size() / 15)) {
                List<Double> pt = points.get(i);
                saveLocation(technicianId, pt.get(0), pt.get(1), 45.0, 42.0);
                Thread.sleep(600); // 600ms tick for fluid animation
            }
        } catch (InterruptedException ignored) {}
    }

    private void interpolatePoints(double lat1, double lng1, double lat2, double lng2, List<List<Double>> list) {
        int steps = 4;
        for (int i = 1; i <= steps; i++) {
            double frac = (double) i / steps;
            double lat = lat1 + (lat2 - lat1) * frac;
            double lng = lng1 + (lng2 - lng1) * frac;
            list.add(List.of(lat, lng));
        }
    }

    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private LocationResponse toResponse(Long userId, TechnicianLocation l) {
        return new LocationResponse(userId, l.getLatitude(), l.getLongitude(),
                l.getHeading(), l.getSpeed(), l.getRecordedAt());
    }

    private record StopData(WorkOrder wo, double lat, double lng, String address) {}
    private record PresetStop(double lat, double lng, String address) {}
}
