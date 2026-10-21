package com.profa.review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);
    boolean existsByBookingId(UUID bookingId);
    long countByTeacherId(UUID teacherId);
    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("select coalesce(avg(r.rating), 0.0) from Review r where r.teacherId = :t")
    double averageFor(@Param("t") UUID teacherId);
}
