package com.keystone.dto.response;

import com.keystone.domain.enums.TriageCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TriageResponse {
    private Long workOrderId;
    private TriageCategory category;
    private Double confidence;
    private String urgency;
    private Integer estimatedDurationMinutes;
    private List<String> requiredSkills;
    private String suggestedAction;
    private Long suggestedTechnicianId;
    private String suggestedTechnicianName;
    private Double suggestedTechnicianDistanceKm;
    private Integer suggestedTechnicianEtaMinutes;
    private String matchReason;
    private Instant triagedAt;
}
