package com.keystone.repository;

import com.keystone.domain.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Page<Customer> findByIsActiveTrue(Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.isActive = true AND " +
           "(LOWER(c.name) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(c.email) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<Customer> searchCustomers(@Param("search") String search, Pageable pageable);

    boolean existsByEmail(String email);
}
