package com.profa.certification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.*;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {
    List<QuizAttempt> findByTeacherIdOrderByStartedAtDesc(UUID teacherId);
    List<QuizAttempt> findByTeacherIdAndSubjectAndLevelOrderByStartedAtDesc(UUID teacherId, String subject, String level);
    long countBySubmittedAtIsNotNull();
    long countByPassedTrue();
}
