package com.keystone.service;

import com.keystone.domain.entity.*;
import com.keystone.dto.request.*;
import com.keystone.dto.response.InventoryForecastResponse;
import com.keystone.dto.response.PartResponse;
import com.keystone.exception.*;
import com.keystone.repository.*;
import com.keystone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.apache.commons.math3.stat.regression.SimpleRegression;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PartService {

    private final PartRepository partRepository;
    private final PartUsageRepository partUsageRepository;
    private final WorkOrderRepository workOrderRepository;
    private final SecurityUtils securityUtils;

    @Transactional
    public PartResponse createPart(com.keystone.dto.request.CreatePartRequest request) {
        if (partRepository.existsByPartNumber(request.getPartNumber())) {
            throw new DuplicateResourceException("Part number already exists: " + request.getPartNumber());
        }
        Part part = Part.builder()
            .partNumber(request.getPartNumber())
            .name(request.getName())
            .description(request.getDescription())
            .unitCost(request.getUnitCost())
            .stockQty(request.getStockQty())
            .minStock(request.getMinStock())
            .isActive(true)
            .build();
        return toResponse(partRepository.save(part));
    }

    @Transactional(readOnly = true)
    public Page<PartResponse> getParts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        return partRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<PartResponse> getLowStockParts() {
        return partRepository.findLowStockParts().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public void logPartUsage(Long workOrderId, LogPartUsageRequest request) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
            .orElseThrow(() -> new ResourceNotFoundException("WorkOrder", workOrderId));
        Part part = partRepository.findById(request.getPartId())
            .orElseThrow(() -> new ResourceNotFoundException("Part", request.getPartId()));

        if (part.getStockQty() < request.getQuantity()) {
            throw new InsufficientStockException(part.getName(), request.getQuantity(), part.getStockQty());
        }

        // Deduct stock
        part.setStockQty(part.getStockQty() - request.getQuantity());
        partRepository.save(part);

        PartUsage usage = PartUsage.builder()
            .workOrder(wo)
            .part(part)
            .quantity(request.getQuantity())
            .unitCostAtUse(part.getUnitCost())
            .usedBy(securityUtils.getCurrentUser())
            .notes(request.getNotes())
            .build();
        partUsageRepository.save(usage);
    }

    @Transactional
    public PartResponse adjustStock(Long partId, int quantity) {
        Part part = partRepository.findById(partId)
            .orElseThrow(() -> new ResourceNotFoundException("Part", partId));
        int newQty = part.getStockQty() + quantity;
        if (newQty < 0) throw new BusinessRuleViolationException("Stock cannot go below zero");
        part.setStockQty(newQty);
        return toResponse(partRepository.save(part));
    }

    @Transactional
    public PartResponse reorderPart(Long partId, Integer quantity) {
        Part part = partRepository.findById(partId)
            .orElseThrow(() -> new ResourceNotFoundException("Part", partId));
        int replenish = (quantity != null && quantity > 0) ? quantity : Math.max(part.getMinStock() * 3, 30);
        part.setStockQty(part.getStockQty() + replenish);
        return toResponse(partRepository.save(part));
    }

    public PartResponse toResponse(Part p) {
        return PartResponse.builder()
            .id(p.getId())
            .partNumber(p.getPartNumber())
            .name(p.getName())
            .description(p.getDescription())
            .unitCost(p.getUnitCost())
            .stockQty(p.getStockQty())
            .minStock(p.getMinStock())
            .isActive(p.getIsActive())
            .lowStock(p.isLowStock())
            .createdAt(p.getCreatedAt())
            .build();
    }

    // ── Predictive Inventory Forecast ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<InventoryForecastResponse> getForecast() {
        return partRepository.findByIsActiveTrue(Pageable.unpaged()).stream()
                .map(this::buildForecast)
                .collect(Collectors.toList());
    }

    private InventoryForecastResponse buildForecast(Part part) {
        // Use 90-day window for regression
        Instant since = Instant.now().minus(90, ChronoUnit.DAYS);
        List<Object[]> rows = partUsageRepository.dailyUsageSince(part.getId(), since);

        double avgDailyUsage = 0;
        Integer daysUntilDepletion = null;
        Instant predictedDepletionDate = null;

        if (rows.size() >= 2) {
            SimpleRegression regression = new SimpleRegression();
            for (int i = 0; i < rows.size(); i++) {
                double qty = ((Number) rows.get(i)[1]).doubleValue();
                regression.addData(i, qty);
            }
            avgDailyUsage = Math.max(regression.predict(rows.size()), 0);
        } else if (!rows.isEmpty()) {
            // Simple average when not enough points for regression
            avgDailyUsage = rows.stream()
                    .mapToDouble(r -> ((Number) r[1]).doubleValue())
                    .average().orElse(0);
        }

        if (avgDailyUsage > 0) {
            daysUntilDepletion = (int) Math.floor(part.getStockQty() / avgDailyUsage);
            predictedDepletionDate = Instant.now().plus(daysUntilDepletion, ChronoUnit.DAYS);
        }

        return InventoryForecastResponse.builder()
                .partId(part.getId())
                .partNumber(part.getPartNumber())
                .name(part.getName())
                .currentStock(part.getStockQty())
                .minStock(part.getMinStock())
                .avgDailyUsage(avgDailyUsage)
                .daysUntilDepletion(daysUntilDepletion)
                .predictedDepletionDate(predictedDepletionDate)
                .criticalAlert(daysUntilDepletion != null && daysUntilDepletion <= 7)
                .build();
    }
}
