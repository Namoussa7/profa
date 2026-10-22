package com.profa.billing;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface PayoutRepository extends JpaRepository<Payout, UUID> {
    List<Payout> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);
    Page<Payout> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
