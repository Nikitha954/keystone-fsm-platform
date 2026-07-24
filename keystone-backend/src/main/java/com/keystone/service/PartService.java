package com.keystone.service;

import com.keystone.domain.entity.*;
import com.keystone.dto.request.*;
import com.keystone.dto.response.PartResponse;
import com.keystone.exception.*;
import com.keystone.repository.*;
import com.keystone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}
