package com.keystone.repository;

import com.keystone.domain.entity.WorkOrder;
import com.keystone.domain.enums.WorkOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {

    Page<WorkOrder> findByAssignedToId(Long technicianId, Pageable pageable);

    Page<WorkOrder> findByAssignedToIdAndStatus(Long technicianId, WorkOrderStatus status, Pageable pageable);

    List<WorkOrder> findByAssignedToIdAndStatusIn(Long technicianId, List<WorkOrderStatus> statuses);

    Page<WorkOrder> findByCustomerId(Long customerId, Pageable pageable);

    Page<WorkOrder> findByStatus(WorkOrderStatus status, Pageable pageable);

    @Query("SELECT wo FROM WorkOrder wo WHERE " +
           "(:status IS NULL OR wo.status = :status) AND " +
           "(:customerId IS NULL OR wo.customer.id = :customerId) AND " +
           "(:assignedToId IS NULL OR wo.assignedTo.id = :assignedToId) AND " +
           "(LOWER(wo.title) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(wo.woNumber) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<WorkOrder> searchWorkOrders(
        @Param("status") WorkOrderStatus status,
        @Param("customerId") Long customerId,
        @Param("assignedToId") Long assignedToId,
        @Param("search") String search,
        Pageable pageable
    );

    // Dashboard queries
    long countByStatus(WorkOrderStatus status);

    @Query("SELECT COUNT(wo) FROM WorkOrder wo WHERE wo.slaDueDate < :now AND wo.status NOT IN ('COMPLETED','CLOSED','CANCELLED')")
    long countSlaBreached(@Param("now") Instant now);

    @Query("SELECT COUNT(wo) FROM WorkOrder wo WHERE wo.assignedTo.id = :techId AND wo.status IN ('ASSIGNED','IN_PROGRESS','ON_HOLD')")
    long countActiveByTechnician(@Param("techId") Long techId);

    boolean existsByWoNumber(String woNumber);
}
