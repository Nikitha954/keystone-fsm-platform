package com.keystone.dto.request;

import com.keystone.domain.enums.RoleName;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.Set;

@Data
public class CreateUserRequest {
    @NotBlank @Size(min = 3, max = 50)
    private String username;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank private String firstName;
    @NotBlank private String lastName;

    private String phone;

    @NotEmpty(message = "At least one role must be assigned")
    private Set<RoleName> roles;
}
