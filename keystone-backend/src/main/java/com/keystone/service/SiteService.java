package com.keystone.service;

import com.keystone.domain.entity.Customer;
import com.keystone.domain.entity.Site;
import com.keystone.dto.request.CreateSiteRequest;
import com.keystone.dto.response.SiteResponse;
import com.keystone.exception.ResourceNotFoundException;
import com.keystone.repository.CustomerRepository;
import com.keystone.repository.SiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SiteService {

    private final SiteRepository siteRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public SiteResponse createSite(CreateSiteRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
            .orElseThrow(() -> new ResourceNotFoundException("Customer", request.getCustomerId()));

        Site site = Site.builder()
            .customer(customer)
            .name(request.getName())
            .address(request.getAddress())
            .city(request.getCity())
            .state(request.getState())
            .postalCode(request.getPostalCode())
            .country(request.getCountry() != null ? request.getCountry() : "UAE")
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .isActive(true)
            .build();

        return toResponse(siteRepository.save(site));
    }

    @Transactional(readOnly = true)
    public Page<SiteResponse> getSitesByCustomer(Long customerId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return siteRepository.findByCustomerIdAndIsActiveTrue(customerId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<SiteResponse> getAllSitesByCustomer(Long customerId) {
        return siteRepository.findByCustomerIdAndIsActiveTrue(customerId)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SiteResponse getSiteById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public SiteResponse updateSite(Long id, CreateSiteRequest request) {
        Site site = findById(id);
        site.setName(request.getName());
        site.setAddress(request.getAddress());
        site.setCity(request.getCity());
        site.setState(request.getState());
        site.setPostalCode(request.getPostalCode());
        site.setLatitude(request.getLatitude());
        site.setLongitude(request.getLongitude());
        return toResponse(siteRepository.save(site));
    }

    @Transactional
    public void deleteSite(Long id) {
        Site site = findById(id);
        site.setIsActive(false);
        siteRepository.save(site);
    }

    private Site findById(Long id) {
        return siteRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Site", id));
    }

    public SiteResponse toResponse(Site s) {
        return SiteResponse.builder()
            .id(s.getId())
            .customerId(s.getCustomer().getId())
            .customerName(s.getCustomer().getName())
            .name(s.getName())
            .address(s.getAddress())
            .city(s.getCity())
            .state(s.getState())
            .postalCode(s.getPostalCode())
            .country(s.getCountry())
            .latitude(s.getLatitude())
            .longitude(s.getLongitude())
            .isActive(s.getIsActive())
            .createdAt(s.getCreatedAt())
            .build();
    }
}
