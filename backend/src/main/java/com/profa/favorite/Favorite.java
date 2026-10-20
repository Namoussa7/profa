package com.profa.favorite;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "favorites")
public class Favorite {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    UUID userId;
    UUID teacherUserId;
    Instant createdAt = Instant.now();

    public UUID getId(){return id;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public UUID getTeacherUserId(){return teacherUserId;} public void setTeacherUserId(UUID v){teacherUserId=v;}
    public Instant getCreatedAt(){return createdAt;}
}
