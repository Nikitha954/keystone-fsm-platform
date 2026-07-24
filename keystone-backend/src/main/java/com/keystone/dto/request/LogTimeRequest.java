package com.keystone.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.Instant;

@Data
public class LogTimeRequest {
    @NotNull private Instant startTime;
    private Instant endTime;
    private String notes;
}
