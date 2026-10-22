package com.profa.billing;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.*;

public interface SchoolSubscriptionRepository extends JpaRepository<SchoolSubscription, UUID> {
    List<SchoolSubscription> findBySchoolIdOrderByCreatedAtDesc(UUID schoolId);
    Page<SchoolSubscription> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<SchoolSubscription> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    long countByStatus(String status);

    @Query("select s from SchoolSubscription s where s.schoolId = :school and s.status = 'ACTIVE' and s.endsAt > :now order by s.endsAt desc")
    List<SchoolSubscription> active(@Param("school") UUID school, @Param("now") Instant now);

    @Query("select distinct s.schoolId from SchoolSubscription s where s.plan = 'PREMIUM' and s.status = 'ACTIVE' and s.endsAt > :now")
    Set<UUID> activePremiumSchools(@Param("now") Instant now);

    @Query("select s.plan, count(s), coalesce(sum(s.amount), 0) from SchoolSubscription s where s.status = 'ACTIVE' and s.endsAt > :now group by s.plan")
    List<Object[]> activeByPlan(@Param("now") Instant now);
}
