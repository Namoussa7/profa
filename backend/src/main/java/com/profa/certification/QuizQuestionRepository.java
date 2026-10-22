package com.profa.certification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, UUID> {
    List<QuizQuestion> findBySubjectAndLevelAndActiveTrue(String subject, String level);

    @Query("select q.subject, q.level, count(q) from QuizQuestion q where q.active = true group by q.subject, q.level order by q.subject, q.level")
    List<Object[]> bankSizes();

    @Query("""
            select q from QuizQuestion q where q.active = true
              and (:subject = '' or q.subject = :subject) and (:level = '' or q.level = :level)
            order by q.subject, q.level, q.createdAt desc
            """)
    Page<QuizQuestion> search(@Param("subject") String subject, @Param("level") String level, Pageable pageable);
}
