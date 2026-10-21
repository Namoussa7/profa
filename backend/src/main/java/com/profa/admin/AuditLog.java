package com.profa.admin;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_audit_logs")
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    UUID adminId;
    @Column(nullable = false) String action;
    String targetType;
    UUID targetId;
    String details;
    @Column(nullable = false) Instant createdAt = Instant.now();
    @Transient String adminName;

    public UUID getId(){return id;}
    public UUID getAdminId(){return adminId;} public void setAdminId(UUID v){adminId=v;}
    public String getAction(){return action;} public void setAction(String v){action=v;}
    public String getTargetType(){return targetType;} public void setTargetType(String v){targetType=v;}
    public UUID getTargetId(){return targetId;} public void setTargetId(UUID v){targetId=v;}
    public String getDetails(){return details;} public void setDetails(String v){details=v;}
    public Instant getCreatedAt(){return createdAt;}
    public String getAdminName(){return adminName;} public void setAdminName(String v){adminName=v;}
}
