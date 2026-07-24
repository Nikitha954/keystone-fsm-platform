package com.keystone.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreateSiteRequest {
    @NotNull private Long customerId;

    @NotBlank @Size(max = 255)
    private String name;

    @NotBlank
    private String address;

    private String city;
    private String state;
    private String postalCode;
    private String country = "UAE";
    private BigDecimal latitude;
    private BigDecimal longitude;
}
