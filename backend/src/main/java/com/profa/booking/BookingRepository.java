package com.profa.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByParentIdOrderByStartsAtDesc(UUID parentId);
    List<Booking> findByTeacherIdOrderByStartsAtDesc(UUID teacherId);
    long countByStatus(String status);
}
