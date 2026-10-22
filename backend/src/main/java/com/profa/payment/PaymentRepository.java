package com.profa.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

import java.util.*;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByExternalReference(String externalReference);
    List<Payment> findByPayerIdOrderByCreatedAtDesc(UUID payerId);
    long countByStatus(String status);
    List<Payment> findTop50ByTeacherIdAndStatusOrderByCreatedAtDesc(UUID teacherId, String status);

    /** Confirmed online payments whose teacher share has not been paid out yet (cash is paid to the teacher directly). */
    @Query("select p from Payment p where p.teacherId = :t and p.status = 'CONFIRMED' and p.payoutId is null and p.teacherAmount > 0 and p.method <> 'CASH'")
    List<Payment> unpaidFor(@Param("t") UUID teacherId);

    @Query("select p.teacherId, sum(p.teacherAmount), count(p) from Payment p where p.status = 'CONFIRMED' and p.payoutId is null and p.teacherAmount > 0 and p.method <> 'CASH' group by p.teacherId")
    List<Object[]> unpaidBalances();

    @Query("select coalesce(sum(p.teacherAmount), 0) from Payment p where p.teacherId = :t and p.status = 'CONFIRMED'")
    Long earnedBy(@Param("t") UUID teacherId);

    @Query("select coalesce(sum(p.commissionAmount), 0) from Payment p where p.status = 'CONFIRMED' and p.confirmedAt >= :from")
    Long commissionsSince(@Param("from") Instant from);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.status = 'CONFIRMED' and p.confirmedAt >= :from")
    Long volumeSince(@Param("from") Instant from);
}
