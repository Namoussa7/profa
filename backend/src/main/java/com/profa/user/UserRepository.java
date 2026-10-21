package com.profa.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    long countByEnabledTrue();
    long countByRole(Role role);
    List<User> findByRole(Role role);

    /** Admin search; empty strings mean "no filter" (avoids untyped NULL parameters on PostgreSQL). */
    @Query("""
            select u from User u
            where (:q = '' or lower(u.email) like :q or lower(u.firstName) like :q or lower(u.lastName) like :q or lower(coalesce(u.phone,'')) like :q)
              and (:role = '' or str(u.role) = :role)
              and (:status = '' or (:status = 'ACTIVE' and u.enabled = true) or (:status = 'BLOCKED' and u.enabled = false))
            """)
    Page<User> search(@Param("q") String q, @Param("role") String role, @Param("status") String status, Pageable pageable);
}
