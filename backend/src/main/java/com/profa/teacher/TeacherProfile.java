package com.profa.teacher;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "teacher_profiles")
public class TeacherProfile {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, unique = true) private UUID userId;
    private String headline;
    @Column(length = 5000) private String bio;
    private String city;
    private String district;
    private String address;
    private Integer hourlyRate;
    private Integer salaryExpectation;
    private String avatarUrl;
    private String introVideoUrl;
    private boolean verified;
    private Integer experienceYears;
    private String languages;
    private String availabilityJson;
    /** Comma separated, e.g. "Mathématiques,Physique". */
    private String subjects;
    /** Comma separated, e.g. "Primaire,Collège,Lycée". */
    private String levels;
    /** Comma separated among ONLINE, HOME, CENTER. */
    private String teachingModes;
    private Boolean trialLessonFree = false;
    /** CV and diploma PDFs uploaded and not rejected: required to appear publicly. */
    private boolean documentsComplete;
    /** Denormalized from reviews for fast sorting/search at scale. */
    private double ratingAvg;
    private int reviewCount;
    private Instant updatedAt = Instant.now();

    public UUID getId(){return id;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public String getHeadline(){return headline;} public void setHeadline(String v){headline=v;}
    public String getBio(){return bio;} public void setBio(String v){bio=v;}
    public String getCity(){return city;} public void setCity(String v){city=v;}
    public String getDistrict(){return district;} public void setDistrict(String v){district=v;}
    public String getAddress(){return address;} public void setAddress(String v){address=v;}
    public Integer getHourlyRate(){return hourlyRate;} public void setHourlyRate(Integer v){hourlyRate=v;}
    public Integer getSalaryExpectation(){return salaryExpectation;} public void setSalaryExpectation(Integer v){salaryExpectation=v;}
    public String getAvatarUrl(){return avatarUrl;} public void setAvatarUrl(String v){avatarUrl=v;}
    public String getIntroVideoUrl(){return introVideoUrl;} public void setIntroVideoUrl(String v){introVideoUrl=v;}
    public boolean isVerified(){return verified;} public void setVerified(boolean v){verified=v;}
    public Integer getExperienceYears(){return experienceYears;} public void setExperienceYears(Integer v){experienceYears=v;}
    public String getLanguages(){return languages;} public void setLanguages(String v){languages=v;}
    public String getAvailabilityJson(){return availabilityJson;} public void setAvailabilityJson(String v){availabilityJson=v;}
    public String getSubjects(){return subjects;} public void setSubjects(String v){subjects=v;}
    public String getLevels(){return levels;} public void setLevels(String v){levels=v;}
    public String getTeachingModes(){return teachingModes;} public void setTeachingModes(String v){teachingModes=v;}
    public boolean isTrialLessonFree(){return Boolean.TRUE.equals(trialLessonFree);} public void setTrialLessonFree(Boolean v){trialLessonFree=v;}
    public boolean isDocumentsComplete(){return documentsComplete;} public void setDocumentsComplete(boolean v){documentsComplete=v;}
    public double getRatingAvg(){return ratingAvg;} public void setRatingAvg(double v){ratingAvg=v;}
    public int getReviewCount(){return reviewCount;} public void setReviewCount(int v){reviewCount=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
