package com.keystone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationResponse {
    private Long userId;
    private Double latitude;
    private Double longitude;
    private Double heading;
    private Double speed;
    private Instant recordedAt;
}
