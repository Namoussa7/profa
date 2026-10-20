package com.profa.job;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "applications")
public class Application {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    UUID jobId;
    /** Teacher's user id. */
    UUID teacherId;
    /** NEW, REVIEWING, SHORTLISTED, INTERVIEW, HIRED, REJECTED. */
    String status = "NEW";
    String coverLetter;
    Instant createdAt = Instant.now();
    @Transient String jobTitle;
    @Transient String teacherName;
    @Transient UUID teacherProfileId;

    public UUID getId(){return id;}
    public UUID getJobId(){return jobId;} public void setJobId(UUID v){jobId=v;}
    public UUID getTeacherId(){return teacherId;} public void setTeacherId(UUID v){teacherId=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getCoverLetter(){return coverLetter;} public void setCoverLetter(String v){coverLetter=v;}
    public Instant getCreatedAt(){return createdAt;}
    public String getJobTitle(){return jobTitle;} public void setJobTitle(String v){jobTitle=v;}
    public String getTeacherName(){return teacherName;} public void setTeacherName(String v){teacherName=v;}
    public UUID getTeacherProfileId(){return teacherProfileId;} public void setTeacherProfileId(UUID v){teacherProfileId=v;}
}
