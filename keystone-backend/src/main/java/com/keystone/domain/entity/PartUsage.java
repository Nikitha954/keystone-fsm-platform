package com.keystone.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "part_usage")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PartUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_cost_at_use", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitCostAtUse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "used_by", nullable = false)
    private User usedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "used_at", nullable = false)
    @Builder.Default
    private Instant usedAt = Instant.now();
}
