package com.keystone.repository;

import com.keystone.domain.entity.User;
import com.keystone.domain.enums.RoleName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.isActive = true")
    List<User> findAllByRoleName(@Param("roleName") RoleName roleName);

    @Query("SELECT u FROM User u WHERE u.isActive = true AND " +
           "(LOWER(u.firstName) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);
}
