package com.keystone.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CustomerFeedbackRequest {
    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;

    private String feedback;
    private String workNotes;
    private String customerSignature;
}
