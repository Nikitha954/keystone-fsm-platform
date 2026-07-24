package com.keystone.dto.response;

import lombok.*;
import java.util.List;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DashboardResponse {
    // Counts by status
    private long totalWorkOrders;
    private long newWorkOrders;
    private long assignedWorkOrders;
    private long inProgressWorkOrders;
    private long onHoldWorkOrders;
    private long completedWorkOrders;
    private long closedWorkOrders;
    private long cancelledWorkOrders;

    // SLA metrics
    private long slaBreachedCount;
    private long slaAtRiskCount;

    // Other stats
    private long totalCustomers;
    private long totalTechnicians;
    private long lowStockPartsCount;

    // Charts data
    private Map<String, Long> workOrdersByPriority;
    private List<Map<String, Object>> weeklyTrend;
    private List<Map<String, Object>> topTechnicians;
}
