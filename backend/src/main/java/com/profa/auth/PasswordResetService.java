package com.profa.auth;

import com.profa.common.MailService;
import com.profa.security.CurrentUser;
import com.profa.security.UserStatusCache;
import com.profa.user.User;
import com.profa.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class PasswordResetService {

    public static final Duration TTL = Duration.ofMinutes(60);
    private static final Duration MIN_INTERVAL = Duration.ofMinutes(2);
    private static final SecureRandom RANDOM = new SecureRandom();

    public record ResetLink(String link, Instant expiresAt) {}

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final MailService mail;
    private final UserStatusCache status;
    private final String frontendUrl;

    public PasswordResetService(UserRepository users, PasswordResetTokenRepository tokens, PasswordEncoder encoder,
                                MailService mail, UserStatusCache status,
                                @Value("${app.frontend-url:https://profa-frontend-v2.onrender.com}") String frontendUrl) {
        this.users = users; this.tokens = tokens; this.encoder = encoder; this.mail = mail; this.status = status;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** Creates a single-use link (previous unused links are revoked). */
    @Transactional
    public ResetLink createLink(User u) {
        tokens.invalidateAll(u.getId(), Instant.now());
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        PasswordResetToken t = new PasswordResetToken();
        t.setUserId(u.getId());
        t.setTokenHash(hash(token));
        t.setExpiresAt(Instant.now().plus(TTL));
        tokens.save(t);
        return new ResetLink(frontendUrl + "/reinitialiser-mot-de-passe?token=" + token, t.getExpiresAt());
    }

    /** "Forgot password": silent when the e-mail is unknown, so accounts cannot be enumerated. */
    @Transactional
    public void requestByEmail(String email) {
        User u = users.findByEmailIgnoreCase(email.trim()).filter(User::isEnabled).orElse(null);
        if (u == null) return;
        var last = tokens.findFirstByUserIdOrderByCreatedAtDesc(u.getId());
        if (last.isPresent() && last.get().getCreatedAt().isAfter(Instant.now().minus(MIN_INTERVAL))) return;
        ResetLink link = createLink(u);
        mail.send(u.getEmail(), "Profa — Réinitialisation de votre mot de passe",
                "Bonjour " + u.getFirstName() + ",\n\n"
                        + "Vous avez demandé à réinitialiser votre mot de passe Profa.\n"
                        + "Cliquez sur ce lien (valable 60 minutes, utilisable une seule fois) :\n\n"
                        + link.link() + "\n\n"
                        + "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nL'équipe Profa");
    }

    @Transactional
    public void reset(String token, String newPassword) {
        if (token == null || token.isBlank()) throw CurrentUser.badRequest("Lien invalide");
        validatePassword(newPassword);
        PasswordResetToken t = tokens.findByTokenHash(hash(token.trim()))
                .orElseThrow(() -> CurrentUser.badRequest("Lien invalide ou déjà utilisé"));
        if (t.getUsedAt() != null) throw CurrentUser.badRequest("Ce lien a déjà été utilisé");
        if (t.getExpiresAt().isBefore(Instant.now())) throw CurrentUser.badRequest("Ce lien a expiré. Faites une nouvelle demande.");
        User u = users.findById(t.getUserId()).orElseThrow(() -> CurrentUser.badRequest("Compte introuvable"));
        setPassword(u, newPassword);
        t.setUsedAt(Instant.now());
        tokens.save(t);
        tokens.invalidateAll(u.getId(), Instant.now());
    }

    /** Updates the hash and revokes every session opened with the old password. */
    @Transactional
    public void setPassword(User u, String newPassword) {
        validatePassword(newPassword);
        u.setPasswordHash(encoder.encode(newPassword));
        u.setPasswordChangedAt(Instant.now());
        users.save(u);
        status.evict(u.getId());
    }

    public static void validatePassword(String p) {
        if (p == null || p.length() < 8) throw CurrentUser.badRequest("Le mot de passe doit contenir au moins 8 caractères");
        if (p.length() > 128) throw CurrentUser.badRequest("Mot de passe trop long");
        if (!p.matches(".*[A-Za-z].*") || !p.matches(".*\\d.*"))
            throw CurrentUser.badRequest("Le mot de passe doit contenir au moins une lettre et un chiffre");
    }
}
