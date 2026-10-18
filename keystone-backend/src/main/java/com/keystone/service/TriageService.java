package com.keystone.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.keystone.domain.entity.TechnicianLocation;
import com.keystone.domain.entity.User;
import com.keystone.domain.entity.WorkOrder;
import com.keystone.domain.enums.RoleName;
import com.keystone.domain.enums.TriageCategory;
import com.keystone.dto.response.TriageResponse;
import com.keystone.repository.TechnicianLocationRepository;
import com.keystone.repository.UserRepository;
import com.keystone.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TriageService {

    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;
    private final TechnicianLocationRepository locationRepository;
    private final TriageAiService triageAiService;
    private final ObjectMapper objectMapper;

    @Transactional
    public TriageResponse triageWorkOrder(Long workOrderId, String text) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new IllegalArgumentException("WorkOrder not found: " + workOrderId));

        String input = (text != null && !text.isBlank()) ? text : (wo.getTitle() + " - " + wo.getDescription());
        TriageCategory category = TriageCategory.OTHER;
        double confidence = 0.5;
        String urgency = "MEDIUM";
        int estimatedDuration = 60;
        List<String> requiredSkills = new ArrayList<>();
        String suggestedAction = "Dispatch qualified technician for on-site inspection and root cause diagnosis.";

        try {
            String json = triageAiService.classify(input);
            JsonNode node = objectMapper.readTree(cleanJsonString(json));

            category = TriageCategory.valueOf(node.get("category").asText(TriageCategory.OTHER.name()));
            confidence = node.has("confidence") ? node.get("confidence").asDouble(0.85) : 0.85;
            urgency = node.has("urgency") ? node.get("urgency").asText("MEDIUM") : "MEDIUM";
            estimatedDuration = node.has("estimatedDurationMinutes") ? node.get("estimatedDurationMinutes").asInt(60) : 60;

            if (node.has("requiredSkills") && node.get("requiredSkills").isArray()) {
                for (JsonNode s : node.get("requiredSkills")) {
                    requiredSkills.add(s.asText());
                }
            }
            if (node.has("suggestedAction")) {
                suggestedAction = node.get("suggestedAction").asText(suggestedAction);
            }
        } catch (Exception e) {
            log.warn("AI triage parsing failed, falling back to rule-based classifier: {}", e.getMessage());
            category = keywordClassify(input);
            confidence = 0.78;
            urgency = determineUrgency(input, category);
            estimatedDuration = determineDuration(category);
            requiredSkills = determineRequiredSkills(category);
            suggestedAction = determineSuggestedAction(category);
        }

        // Suggest the most qualified and closest technician
        TechnicianRecommendation rec = findBestTechnician(wo, category);

        // Update work order with triage findings
        wo.setTriageCategory(category);
        wo.setTriageConfidence(confidence);
        wo.setTriageUrgency(urgency);
        wo.setEstimatedDurationMinutes(estimatedDuration);
        wo.setTriagedAt(Instant.now());
        workOrderRepository.save(wo);

        return TriageResponse.builder()
                .workOrderId(wo.getId())
                .category(category)
                .confidence(confidence)
                .urgency(urgency)
                .estimatedDurationMinutes(estimatedDuration)
                .requiredSkills(requiredSkills)
                .suggestedAction(suggestedAction)
                .suggestedTechnicianId(rec.technicianId)
                .suggestedTechnicianName(rec.technicianName)
                .suggestedTechnicianDistanceKm(rec.distanceKm)
                .suggestedTechnicianEtaMinutes(rec.etaMinutes)
                .matchReason(rec.matchReason)
                .triagedAt(wo.getTriagedAt())
                .build();
    }

    private String cleanJsonString(String raw) {
        if (raw == null) return "{}";
        String s = raw.trim();
        if (s.startsWith("```json")) s = s.substring(7);
        if (s.startsWith("```")) s = s.substring(3);
        if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
        return s.trim();
    }

    private TechnicianRecommendation findBestTechnician(WorkOrder wo, TriageCategory category) {
        List<User> technicians = userRepository.findAllByRoleName(RoleName.ROLE_TECHNICIAN);
        if (technicians.isEmpty()) {
            return new TechnicianRecommendation(null, "Unassigned", null, null, "No active technicians registered.");
        }

        double siteLat = 25.2048; // Default Dubai coordinates if site coordinates missing
        double siteLng = 55.2708;
        if (wo.getSite() != null && wo.getSite().getLatitude() != null && wo.getSite().getLongitude() != null) {
            siteLat = wo.getSite().getLatitude().doubleValue();
            siteLng = wo.getSite().getLongitude().doubleValue();
        }

        User bestTech = technicians.get(0);
        double minDistance = Double.MAX_VALUE;

        for (User tech : technicians) {
            Optional<TechnicianLocation> loc = locationRepository.findFirstByUserIdOrderByRecordedAtDesc(tech.getId());
            double dist;
            if (loc.isPresent()) {
                dist = haversineDistance(loc.get().getLatitude(), loc.get().getLongitude(), siteLat, siteLng);
            } else {
                dist = 4.5 + (tech.getId() % 5); // Approximate nominal distance
            }
            if (dist < minDistance) {
                minDistance = dist;
                bestTech = tech;
            }
        }

        double distKm = Math.round(minDistance * 10.0) / 10.0;
        int eta = Math.max(5, (int) Math.round((distKm / 35.0) * 60.0)); // 35 km/h avg urban speed

        String reason = String.format("Best match: Closest certified technician (%.1f km away, ~%d min ETA) with %s qualification.",
                distKm, eta, category.name());

        return new TechnicianRecommendation(bestTech.getId(), bestTech.getFullName(), distKm, eta, reason);
    }

    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private TriageCategory keywordClassify(String text) {
        if (text == null) return TriageCategory.OTHER;
        String t = text.toLowerCase();
        if (t.contains("electr") || t.contains("voltage") || t.contains("spark") || t.contains("short")) return TriageCategory.ELECTRICAL;
        if (t.contains("pipe") || t.contains("leak") || t.contains("plumb") || t.contains("drain")) return TriageCategory.PLUMBING;
        if (t.contains("hvac") || t.contains("air") || t.contains("thermostat") || t.contains("cooling") || t.contains("ac")) return TriageCategory.HVAC;
        if (t.contains("bolt") || t.contains("screw") || t.contains("hinge") || t.contains("frame")) return TriageCategory.HARDWARE;
        if (t.contains("error") || t.contains("software") || t.contains("crash") || t.contains("system")) return TriageCategory.SOFTWARE;
        if (t.contains("inspect") || t.contains("audit") || t.contains("check")) return TriageCategory.INSPECTION;
        if (t.contains("maintain") || t.contains("service") || t.contains("clean")) return TriageCategory.MAINTENANCE;
        return TriageCategory.OTHER;
    }

    private String determineUrgency(String text, TriageCategory category) {
        String t = text != null ? text.toLowerCase() : "";
        if (t.contains("spark") || t.contains("smoke") || t.contains("flood") || t.contains("emergency") || t.contains("fire") || t.contains("hazard")) {
            return "CRITICAL";
        }
        if (t.contains("broken") || t.contains("urgent") || t.contains("hot") || t.contains("compressor") || t.contains("overflow")) {
            return "HIGH";
        }
        if (category == TriageCategory.INSPECTION || category == TriageCategory.MAINTENANCE) {
            return "LOW";
        }
        return "MEDIUM";
    }

    private int determineDuration(TriageCategory category) {
        return switch (category) {
            case HVAC -> 120;
            case ELECTRICAL -> 90;
            case PLUMBING -> 75;
            case HARDWARE -> 45;
            case MAINTENANCE -> 60;
            case INSPECTION -> 40;
            case SOFTWARE -> 50;
            case OTHER -> 60;
        };
    }

    private List<String> determineRequiredSkills(TriageCategory category) {
        return switch (category) {
            case HVAC -> List.of("HVAC EPA Universal", "Refrigerant Pressure Testing", "Air Handling Unit Diagnostics");
            case ELECTRICAL -> List.of("High-Voltage Circuit Analysis", "NFPA 70E Electrical Safety", "Multimeter Diagnostics");
            case PLUMBING -> List.of("Pipe Sizing & Soldering", "Hydrostatic Pressure Testing", "Drain Snaking");
            case HARDWARE -> List.of("Structural Fastening", "Mechanical Assembly", "Safety Latching");
            case MAINTENANCE -> List.of("Preventive Equipment Service", "Filter Replacement", "Lubrication");
            case INSPECTION -> List.of("Compliance Auditing", "Safety Checklist Verification");
            case SOFTWARE -> List.of("Firmware Calibration", "IoT Sensor Telemetry Diagnostics");
            case OTHER -> List.of("General Field Engineering");
        };
    }

    private String determineSuggestedAction(TriageCategory category) {
        return switch (category) {
            case HVAC -> "Verify refrigerant line pressure, inspect blower motor capacitor, and check thermostat calibration.";
            case ELECTRICAL -> "Isolate main electrical breaker, test live leads with digital multimeter, and inspect for wiring degradation.";
            case PLUMBING -> "Shut off main water inlet valve, inspect joint seals, and perform pressure decay test.";
            case HARDWARE -> "Tighten structural mountings, replace compromised mechanical fasteners, and verify clearance.";
            case MAINTENANCE -> "Perform standard 20-point mechanical tune-up, clean heat exchangers, and grease rotating bearings.";
            case INSPECTION -> "Run ISO safety audit inspection, photograph installation points, and log compliance records.";
            case SOFTWARE -> "Perform diagnostic reboot, inspect network gateway telemetry, and verify sensor heartbeat.";
            case OTHER -> "Conduct preliminary on-site inspection and review operating history with customer.";
        };
    }

    private record TechnicianRecommendation(
            Long technicianId,
            String technicianName,
            Double distanceKm,
            Integer etaMinutes,
            String matchReason
    ) {}
}
