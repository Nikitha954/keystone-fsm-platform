package com.keystone.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PartResponse {
    private Long id;
    private String partNumber;
    private String name;
    private String description;
    private BigDecimal unitCost;
    private Integer stockQty;
    private Integer minStock;
    private Boolean isActive;
    private boolean lowStock;
    private Instant createdAt;
}
