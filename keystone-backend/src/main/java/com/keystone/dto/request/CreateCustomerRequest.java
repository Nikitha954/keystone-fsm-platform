package com.keystone.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateCustomerRequest {
    @NotBlank @Size(max = 255)
    private String name;

    @Email
    private String email;

    private String phone;
    private String address;
}
