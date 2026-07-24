package com.keystone.service;

import com.keystone.domain.entity.Role;
import com.keystone.domain.entity.User;
import com.keystone.domain.enums.RoleName;
import com.keystone.dto.request.CreateUserRequest;
import com.keystone.dto.response.UserResponse;
import com.keystone.exception.DuplicateResourceException;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.RoleRepository;
import com.keystone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already in use: " + request.getEmail());
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username already taken: " + request.getUsername());
        }

        Set<Role> roles = new HashSet<>();
        for (RoleName roleName : request.getRoles()) {
            Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));
            roles.add(role);
        }

        User user = User.builder()
            .username(request.getUsername())
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .phone(request.getPhone())
            .roles(roles)
            .isActive(true)
            .build();

        User saved = userRepository.save(user);
        log.info("Created user: {} with roles: {}", saved.getEmail(), request.getRoles());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (search != null && !search.isBlank()) {
            return userRepository.searchUsers(search, pageable).map(this::toResponse);
        }
        return userRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getTechnicians() {
        return userRepository.findAllByRoleName(RoleName.ROLE_TECHNICIAN)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public UserResponse toggleUserStatus(Long id) {
        User user = findById(id);
        user.setIsActive(!user.getIsActive());
        return toResponse(userRepository.save(user));
    }

    private User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .fullName(user.getFullName())
            .phone(user.getPhone())
            .isActive(user.getIsActive())
            .roles(user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet()))
            .createdAt(user.getCreatedAt())
            .build();
    }
}
