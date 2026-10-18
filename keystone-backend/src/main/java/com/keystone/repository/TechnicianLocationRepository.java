package com.keystone.repository;

import com.keystone.domain.entity.TechnicianLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TechnicianLocationRepository extends JpaRepository<TechnicianLocation, Long> {

    Optional<TechnicianLocation> findFirstByUserIdOrderByRecordedAtDesc(Long userId);

    /** Latest location per technician (one row per user). */
    @Query(value = """
            SELECT DISTINCT ON (tl.user_id) tl.*
            FROM technician_locations tl
            ORDER BY tl.user_id, tl.recorded_at DESC
            """, nativeQuery = true)
    List<TechnicianLocation> findLatestPerTechnician();

    /**
     * Nearest technicians to a given lat/lng using PostGIS ST_Distance.
     * Returns up to :limit rows ordered by distance ascending.
     */
    @Query(value = """
            SELECT DISTINCT ON (tl.user_id) tl.*
            FROM technician_locations tl
            WHERE tl.geom IS NOT NULL
            ORDER BY tl.user_id,
                     ST_Distance(
                         tl.geom::geography,
                         ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                     ) ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<TechnicianLocation> findNearestTechnicians(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("limit") int limit);
}
