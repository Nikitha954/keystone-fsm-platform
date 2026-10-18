package com.keystone.repository;

import com.keystone.domain.entity.PartUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface PartUsageRepository extends JpaRepository<PartUsage, Long> {
    List<PartUsage> findByWorkOrderId(Long workOrderId);

    /** Returns daily usage totals for a part over the given window (for regression). */
    @Query(value = """
            SELECT DATE_TRUNC('day', used_at) AS day, SUM(quantity) AS total
            FROM part_usage
            WHERE part_id = :partId AND used_at >= :since
            GROUP BY 1 ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> dailyUsageSince(@Param("partId") Long partId, @Param("since") Instant since);
}
