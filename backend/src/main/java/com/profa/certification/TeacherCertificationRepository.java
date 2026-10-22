package com.profa.certification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface TeacherCertificationRepository extends JpaRepository<TeacherCertification, UUID> {
    List<TeacherCertification> findByTeacherIdOrderBySubjectAsc(UUID teacherId);
    List<TeacherCertification> findByTeacherIdIn(Collection<UUID> teacherIds);
    Optional<TeacherCertification> findByTeacherIdAndSubjectAndLevel(UUID teacherId, String subject, String level);
    long countByTeacherId(UUID teacherId);
}
