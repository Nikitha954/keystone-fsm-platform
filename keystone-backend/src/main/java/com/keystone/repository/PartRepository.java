package com.keystone.repository;

import com.keystone.domain.entity.Part;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PartRepository extends JpaRepository<Part, Long> {
    Optional<Part> findByPartNumber(String partNumber);
    boolean existsByPartNumber(String partNumber);
    Page<Part> findByIsActiveTrue(Pageable pageable);

    @Query("SELECT p FROM Part p WHERE p.isActive = true AND p.stockQty <= p.minStock")
    List<Part> findLowStockParts();
}
