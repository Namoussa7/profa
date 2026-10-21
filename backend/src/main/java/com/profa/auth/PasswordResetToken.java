package com.profa.auth;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Only the SHA-256 hash of the token is stored; the clear token exists only in the e-mailed link. */
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {
    @Id @GeneratedValue(strategy = GenerationType.UUID) UUID id;
    @Column(nullable = false) UUID userId;
    @Column(nullable = false, unique = true) String tokenHash;
    @Column(nullable = false) Instant expiresAt;
    Instant usedAt;
    @Column(nullable = false) Instant createdAt = Instant.now();

    public UUID getId(){return id;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public String getTokenHash(){return tokenHash;} public void setTokenHash(String v){tokenHash=v;}
    public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant v){expiresAt=v;}
    public Instant getUsedAt(){return usedAt;} public void setUsedAt(Instant v){usedAt=v;}
    public Instant getCreatedAt(){return createdAt;}
}
