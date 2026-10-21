package com.profa.document;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "teacher_documents")
public class TeacherDocument {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    /** Teacher's user id. */
    UUID teacherId;
    /** CV, DIPLOMA (required) or ID_CARD, CERTIFICATE, CRIMINAL_RECORD, OTHER. */
    String type;
    /** Legacy link-based documents (before PDF upload). */
    String fileUrl;
    String fileName;
    String contentType;
    Long sizeBytes;
    /** PENDING, APPROVED, REJECTED. */
    String status = "PENDING";
    String rejectionReason;
    Instant reviewedAt;
    Instant createdAt = Instant.now();
    @Transient String teacherName;
    @Transient UUID teacherProfileId;

    public UUID getId(){return id;}
    public UUID getTeacherId(){return teacherId;} public void setTeacherId(UUID v){teacherId=v;}
    public String getType(){return type;} public void setType(String v){type=v;}
    public String getFileUrl(){return fileUrl;} public void setFileUrl(String v){fileUrl=v;}
    public String getFileName(){return fileName;} public void setFileName(String v){fileName=v;}
    public String getContentType(){return contentType;} public void setContentType(String v){contentType=v;}
    public Long getSizeBytes(){return sizeBytes;} public void setSizeBytes(Long v){sizeBytes=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getRejectionReason(){return rejectionReason;} public void setRejectionReason(String v){rejectionReason=v;}
    public Instant getReviewedAt(){return reviewedAt;} public void setReviewedAt(Instant v){reviewedAt=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    /** True when a PDF is stored (downloadable through /api/v1/documents/{id}/file). */
    public boolean isHasFile(){return sizeBytes != null && sizeBytes > 0;}
    public String getTeacherName(){return teacherName;} public void setTeacherName(String v){teacherName=v;}
    public UUID getTeacherProfileId(){return teacherProfileId;} public void setTeacherProfileId(UUID v){teacherProfileId=v;}
}
