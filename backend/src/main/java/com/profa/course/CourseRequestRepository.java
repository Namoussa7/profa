package com.profa.course;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface CourseRequestRepository extends JpaRepository<CourseRequest, UUID> {
    List<CourseRequest> findByParentIdOrderByCreatedAtDesc(UUID parentId);
    List<CourseRequest> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);
    List<CourseRequest> findTop50ByTeacherIdIsNullAndStatusOrderByCreatedAtDesc(String status);
    long countByStatus(String status);
}
