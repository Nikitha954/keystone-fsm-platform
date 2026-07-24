package com.keystone.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SiteResponse {
    private Long id;
    private Long customerId;
    private String customerName;
    private String name;
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Boolean isActive;
    private Instant createdAt;
}
