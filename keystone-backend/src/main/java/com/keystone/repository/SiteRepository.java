package com.keystone.repository;

import com.keystone.domain.entity.Site;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SiteRepository extends JpaRepository<Site, Long> {
    Page<Site> findByCustomerIdAndIsActiveTrue(Long customerId, Pageable pageable);
    List<Site> findByCustomerIdAndIsActiveTrue(Long customerId);
}
