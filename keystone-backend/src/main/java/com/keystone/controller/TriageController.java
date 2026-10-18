package com.keystone.controller;

import com.keystone.dto.request.TriageRequest;
import com.keystone.dto.response.ApiResponse;
import com.keystone.dto.response.TriageResponse;
import com.keystone.service.TriageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/triage")
@Tag(name = "AI Triage & Smart Dispatch", description = "NLP analysis, urgency ranking, and intelligent technician matching")
public class TriageController {

    private final TriageService triageService;

    public TriageController(TriageService triageService) {
        this.triageService = triageService;
    }

    @PostMapping
    @Operation(summary = "Analyze work order with NLP, assess urgency, estimate duration, and recommend technician")
    public ResponseEntity<ApiResponse<TriageResponse>> triage(@Valid @RequestBody TriageRequest req) {
        TriageResponse resp = triageService.triageWorkOrder(req.getWorkOrderId(), req.getText());
        return ResponseEntity.ok(ApiResponse.success("AI Triage completed", resp));
    }
}
