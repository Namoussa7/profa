package com.profa.certification;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    @Column(nullable = false) UUID teacherId;
    @Column(nullable = false) String subject;
    @Column(nullable = false) String level;
    /** Comma separated ids, in the order shown to the teacher. */
    @Column(nullable = false) String questionIds;
    @Column(nullable = false) Instant startedAt = Instant.now();
    @Column(nullable = false) Instant expiresAt;
    Instant submittedAt;
    Integer score;
    Boolean passed;

    public UUID getId(){return id;}
    public UUID getTeacherId(){return teacherId;} public void setTeacherId(UUID v){teacherId=v;}
    public String getSubject(){return subject;} public void setSubject(String v){subject=v;}
    public String getLevel(){return level;} public void setLevel(String v){level=v;}
    public String getQuestionIds(){return questionIds;} public void setQuestionIds(String v){questionIds=v;}
    public Instant getStartedAt(){return startedAt;}
    public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant v){expiresAt=v;}
    public Instant getSubmittedAt(){return submittedAt;} public void setSubmittedAt(Instant v){submittedAt=v;}
    public Integer getScore(){return score;} public void setScore(Integer v){score=v;}
    public Boolean getPassed(){return passed;} public void setPassed(Boolean v){passed=v;}
}
