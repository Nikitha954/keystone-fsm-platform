package com.keystone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryForecastResponse {
    private Long partId;
    private String partNumber;
    private String name;
    private int currentStock;
    private int minStock;
    private double avgDailyUsage;
    private Integer daysUntilDepletion;   // null = no usage data
    private Instant predictedDepletionDate;
    private boolean criticalAlert;        // depletion within 7 days
}
