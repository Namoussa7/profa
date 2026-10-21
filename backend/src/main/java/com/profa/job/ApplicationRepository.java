package com.profa.job;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    List<Application> findByJobId(UUID jobId);
    List<Application> findByTeacherId(UUID teacherId);
    long countByJobId(UUID jobId);
    boolean existsByJobIdAndTeacherId(UUID jobId, UUID teacherId);

    /** True when the teacher applied to one of this school's offers (the school may then read the CV). */
    @Query("select count(a) > 0 from Application a, JobOffer j where a.jobId = j.id and a.teacherId = :teacher and j.schoolId = :school")
    boolean teacherAppliedToSchool(@Param("teacher") UUID teacher, @Param("school") UUID school);
}
