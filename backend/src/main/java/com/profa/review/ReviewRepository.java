package com.profa.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);
    boolean existsByBookingId(UUID bookingId);
}
