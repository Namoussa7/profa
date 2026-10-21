package com.profa.document;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface TeacherDocumentRepository extends JpaRepository<TeacherDocument, UUID> {
    List<TeacherDocument> findByTeacherId(UUID teacherId);
    List<TeacherDocument> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);
    Optional<TeacherDocument> findFirstByTeacherIdAndTypeOrderByCreatedAtDesc(UUID teacherId, String type);
    long countByStatus(String status);
    Page<TeacherDocument> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<TeacherDocument> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
