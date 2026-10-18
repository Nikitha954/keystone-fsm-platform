package com.keystone.dto.response;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteOptimizationResponse {
    private Long technicianId;
    private String technicianName;
    private RouteLocation startLocation;
    private List<RouteStop> stops;
    private Double totalDistanceKm;
    private Double originalDistanceKm;
    private Double distanceSavedKm;
    private Double fuelSavedLiters;
    private Integer estimatedDriveTimeMinutes;
    private Double savingsPercentage;
    private List<List<Double>> polylineCoordinates;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RouteLocation {
        private Double latitude;
        private Double longitude;
        private String address;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RouteStop {
        private Integer stopNumber;
        private Long workOrderId;
        private String woNumber;
        private String title;
        private String customerName;
        private String siteAddress;
        private Double latitude;
        private Double longitude;
        private String priority;
        private String estimatedArrival;
        private Integer durationMinutes;
        private Double distanceToNextKm;
    }
}
