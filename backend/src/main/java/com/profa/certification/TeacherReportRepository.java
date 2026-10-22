package com.profa.certification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface TeacherReportRepository extends JpaRepository<TeacherReport, UUID> {
    Page<TeacherReport> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    long countByStatus(String status);
    long countByTeacherIdAndStatus(UUID teacherId, String status);
    boolean existsByReporterIdAndTeacherIdAndStatus(UUID reporterId, UUID teacherId, String status);
}
