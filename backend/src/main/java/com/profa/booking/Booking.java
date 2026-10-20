package com.profa.booking;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "bookings")
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    UUID parentId;
    /** Teacher's user id. */
    UUID teacherId;
    UUID courseRequestId;
    LocalDateTime startsAt;
    LocalDateTime endsAt;
    Integer amount;
    String mode;
    /** PENDING_PAYMENT, CONFIRMED, COMPLETED, CANCELLED. */
    String status = "PENDING_PAYMENT";
    /** UNPAID, PAID, REFUNDED. */
    String paymentStatus = "UNPAID";
    String meetingUrl;
    String address;
    Instant createdAt = Instant.now();
    @Transient String parentName;
    @Transient String teacherName;
    @Transient Boolean reviewed;

    public UUID getId(){return id;}
    public UUID getParentId(){return parentId;} public void setParentId(UUID v){parentId=v;}
    public UUID getTeacherId(){return teacherId;} public void setTeacherId(UUID v){teacherId=v;}
    public UUID getCourseRequestId(){return courseRequestId;} public void setCourseRequestId(UUID v){courseRequestId=v;}
    public LocalDateTime getStartsAt(){return startsAt;} public void setStartsAt(LocalDateTime v){startsAt=v;}
    public LocalDateTime getEndsAt(){return endsAt;} public void setEndsAt(LocalDateTime v){endsAt=v;}
    public Integer getAmount(){return amount;} public void setAmount(Integer v){amount=v;}
    public String getMode(){return mode;} public void setMode(String v){mode=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getPaymentStatus(){return paymentStatus;} public void setPaymentStatus(String v){paymentStatus=v;}
    public String getMeetingUrl(){return meetingUrl;} public void setMeetingUrl(String v){meetingUrl=v;}
    public String getAddress(){return address;} public void setAddress(String v){address=v;}
    public Instant getCreatedAt(){return createdAt;}
    public String getParentName(){return parentName;} public void setParentName(String v){parentName=v;}
    public String getTeacherName(){return teacherName;} public void setTeacherName(String v){teacherName=v;}
    public Boolean getReviewed(){return reviewed;} public void setReviewed(Boolean v){reviewed=v;}
}
