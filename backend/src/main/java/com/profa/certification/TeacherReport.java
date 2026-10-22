package com.profa.certification;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "teacher_reports")
public class TeacherReport {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    @Column(nullable = false) UUID reporterId;
    /** Teacher's user id. */
    @Column(nullable = false) UUID teacherId;
    /** ABSENCE, BEHAVIOR, SAFETY, LEVEL, FRAUD, OTHER. */
    @Column(nullable = false) String reason;
    String details;
    /** OPEN, RESOLVED. */
    @Column(nullable = false) String status = "OPEN";
    String resolution;
    @Column(nullable = false) Instant createdAt = Instant.now();
    @Transient String reporterName;
    @Transient String teacherName;
    @Transient UUID teacherProfileId;

    public UUID getId(){return id;}
    public UUID getReporterId(){return reporterId;} public void setReporterId(UUID v){reporterId=v;}
    public UUID getTeacherId(){return teacherId;} public void setTeacherId(UUID v){teacherId=v;}
    public String getReason(){return reason;} public void setReason(String v){reason=v;}
    public String getDetails(){return details;} public void setDetails(String v){details=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getResolution(){return resolution;} public void setResolution(String v){resolution=v;}
    public Instant getCreatedAt(){return createdAt;}
    public String getReporterName(){return reporterName;} public void setReporterName(String v){reporterName=v;}
    public String getTeacherName(){return teacherName;} public void setTeacherName(String v){teacherName=v;}
    public UUID getTeacherProfileId(){return teacherProfileId;} public void setTeacherProfileId(UUID v){teacherProfileId=v;}
}
