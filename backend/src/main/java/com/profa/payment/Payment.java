package com.profa.payment;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "payments")
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    UUID bookingId;
    UUID payerId;
    Integer amount;
    String currency = "XOF";
    String provider;
    String method;
    String externalReference;
    String status = "PENDING";
    Instant createdAt = Instant.now();
    /** Teacher's user id (copied from the booking when the payment is confirmed). */
    UUID teacherId;
    /** Platform share, frozen at confirmation time. */
    Integer commissionRate;
    Integer commissionAmount;
    Integer teacherAmount;
    /** Set once the teacher's share has been paid out. */
    UUID payoutId;
    Instant confirmedAt;

    public UUID getId(){return id;}
    public UUID getBookingId(){return bookingId;} public void setBookingId(UUID v){bookingId=v;}
    public UUID getPayerId(){return payerId;} public void setPayerId(UUID v){payerId=v;}
    public Integer getAmount(){return amount;} public void setAmount(Integer v){amount=v;}
    public String getCurrency(){return currency;}
    public String getProvider(){return provider;} public void setProvider(String v){provider=v;}
    public String getMethod(){return method;} public void setMethod(String v){method=v;}
    public String getExternalReference(){return externalReference;} public void setExternalReference(String v){externalReference=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public Instant getCreatedAt(){return createdAt;}
    public UUID getTeacherId(){return teacherId;} public void setTeacherId(UUID v){teacherId=v;}
    public Integer getCommissionRate(){return commissionRate;} public void setCommissionRate(Integer v){commissionRate=v;}
    public Integer getCommissionAmount(){return commissionAmount;} public void setCommissionAmount(Integer v){commissionAmount=v;}
    public Integer getTeacherAmount(){return teacherAmount;} public void setTeacherAmount(Integer v){teacherAmount=v;}
    public UUID getPayoutId(){return payoutId;} public void setPayoutId(UUID v){payoutId=v;}
    public Instant getConfirmedAt(){return confirmedAt;} public void setConfirmedAt(Instant v){confirmedAt=v;}
}
