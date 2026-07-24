package com.keystone.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreatePartRequest {
    @NotBlank private String partNumber;
    @NotBlank private String name;
    private String description;
    @NotNull @DecimalMin("0.00") private BigDecimal unitCost;
    @NotNull @Min(0) private Integer stockQty;
    @NotNull @Min(0) private Integer minStock;
}
