package com.keystone.repository;

import com.keystone.domain.entity.TimeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TimeLogRepository extends JpaRepository<TimeLog, Long> {
    List<TimeLog> findByWorkOrderId(Long workOrderId);

    @Query("SELECT COALESCE(SUM(t.durationMinutes),0) FROM TimeLog t WHERE t.workOrder.id = :woId")
    Integer sumDurationByWorkOrder(@Param("woId") Long workOrderId);
}
