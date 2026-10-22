package com.profa.billing;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "school_subscriptions")
public class SchoolSubscription {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    /** School's user id. */
    @Column(nullable = false) UUID schoolId;
    /** STANDARD or PREMIUM. */
    @Column(nullable = false) String plan;
    /** PENDING (waiting for payment), ACTIVE, CANCELLED. Expiry is read from endsAt. */
    @Column(nullable = false) String status = "PENDING";
    @Column(nullable = false) int amount;
    @Column(nullable = false, unique = true) String reference;
    String method;
    Instant startsAt;
    Instant endsAt;
    @Column(nullable = false) Instant createdAt = Instant.now();
    @Transient String schoolName;

    public UUID getId(){return id;}
    public UUID getSchoolId(){return schoolId;} public void setSchoolId(UUID v){schoolId=v;}
    public String getPlan(){return plan;} public void setPlan(String v){plan=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public int getAmount(){return amount;} public void setAmount(int v){amount=v;}
    public String getReference(){return reference;} public void setReference(String v){reference=v;}
    public String getMethod(){return method;} public void setMethod(String v){method=v;}
    public Instant getStartsAt(){return startsAt;} public void setStartsAt(Instant v){startsAt=v;}
    public Instant getEndsAt(){return endsAt;} public void setEndsAt(Instant v){endsAt=v;}
    public Instant getCreatedAt(){return createdAt;}
    public String getSchoolName(){return schoolName;} public void setSchoolName(String v){schoolName=v;}
    public boolean isActiveNow(){return "ACTIVE".equals(status) && endsAt != null && endsAt.isAfter(Instant.now());}
}
