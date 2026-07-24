package com.keystone.service;

import com.keystone.domain.entity.Customer;
import com.keystone.dto.request.CreateCustomerRequest;
import com.keystone.dto.response.CustomerResponse;
import com.keystone.exception.DuplicateResourceException;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.CustomerRepository;
import com.keystone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final SecurityUtils securityUtils;

    @Transactional
    public CustomerResponse createCustomer(CreateCustomerRequest request) {
        if (request.getEmail() != null && customerRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Customer with email already exists: " + request.getEmail());
        }
        Customer customer = Customer.builder()
            .name(request.getName())
            .email(request.getEmail())
            .phone(request.getPhone())
            .address(request.getAddress())
            .createdBy(securityUtils.getCurrentUser())
            .isActive(true)
            .build();
        return toResponse(customerRepository.save(customer));
    }

    @Transactional(readOnly = true)
    public Page<CustomerResponse> getCustomers(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (search != null && !search.isBlank()) {
            return customerRepository.searchCustomers(search, pageable).map(this::toResponse);
        }
        return customerRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public CustomerResponse updateCustomer(Long id, CreateCustomerRequest request) {
        Customer customer = findById(id);
        customer.setName(request.getName());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        return toResponse(customerRepository.save(customer));
    }

    @Transactional
    public void deleteCustomer(Long id) {
        Customer customer = findById(id);
        customer.setIsActive(false);
        customerRepository.save(customer);
    }

    private Customer findById(Long id) {
        return customerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
    }

    public CustomerResponse toResponse(Customer c) {
        return CustomerResponse.builder()
            .id(c.getId())
            .name(c.getName())
            .email(c.getEmail())
            .phone(c.getPhone())
            .address(c.getAddress())
            .isActive(c.getIsActive())
            .createdAt(c.getCreatedAt())
            .siteCount(c.getSites() != null ? c.getSites().size() : 0)
            .build();
    }
}
