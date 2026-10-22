package com.profa.certification;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "teacher_certifications")
public class TeacherCertification {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    @Column(nullable = false) UUID teacherId;
    @Column(nullable = false) String subject;
    @Column(nullable = false) String level;
    @Column(nullable = false) int score;
    @Column(nullable = false) Instant passedAt = Instant.now();

    public UUID getId(){return id;}
    public UUID getTeacherId(){return teacherId;} public void setTeacherId(UUID v){teacherId=v;}
    public String getSubject(){return subject;} public void setSubject(String v){subject=v;}
    public String getLevel(){return level;} public void setLevel(String v){level=v;}
    public int getScore(){return score;} public void setScore(int v){score=v;}
    public Instant getPassedAt(){return passedAt;} public void setPassedAt(Instant v){passedAt=v;}
}
