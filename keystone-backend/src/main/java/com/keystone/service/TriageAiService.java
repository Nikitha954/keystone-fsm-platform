package com.keystone.service;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.spring.AiService;

/**
 * LangChain4j declarative AI service.
 * Spring Boot auto-creates the implementation bean via @AiService.
 */
@AiService
public interface TriageAiService {

    @SystemMessage("""
            You are an expert AI field-service dispatcher. Analyze the work-order description and
            respond with ONLY a valid raw JSON object — no markdown, no code blocks, no explanation — in this exact shape:
            {
              "category": "<CATEGORY>",
              "confidence": <0.0-1.0>,
              "urgency": "<LOW|MEDIUM|HIGH|CRITICAL>",
              "estimatedDurationMinutes": <integer minutes>,
              "requiredSkills": ["<skill1>", "<skill2>"],
              "suggestedAction": "<short actionable triage action>"
            }
            Valid categories: ELECTRICAL, PLUMBING, HVAC, HARDWARE, SOFTWARE, INSPECTION, MAINTENANCE, OTHER
            """)
    @UserMessage("Work-order description: {{it}}")
    String classify(String description);
}
