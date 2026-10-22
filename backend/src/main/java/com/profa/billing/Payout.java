package com.profa.billing;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Money transferred to a teacher (Orange Money, Wave…), covering several confirmed payments. */
@Entity
@Table(name = "payouts")
public class Payout {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    @Column(nullable = false) UUID teacherId;
    @Column(nullable = false) int amount;
    String method;
    String reference;
    @Column(nullable = false) String status = "PAID";
    @Column(nullable = false) Instant createdAt = Instant.now();
    @Transient String teacherName;

    public UUID getId(){return id;}
    public UUID getTeacherId(){return teacherId;} public void setTeacherId(UUID v){teacherId=v;}
    public int getAmount(){return amount;} public void setAmount(int v){amount=v;}
    public String getMethod(){return method;} public void setMethod(String v){method=v;}
    public String getReference(){return reference;} public void setReference(String v){reference=v;}
    public String getStatus(){return status;}
    public Instant getCreatedAt(){return createdAt;}
    public String getTeacherName(){return teacherName;} public void setTeacherName(String v){teacherName=v;}
}
