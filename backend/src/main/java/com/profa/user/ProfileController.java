package com.profa.user;

import com.profa.auth.PasswordResetService;
import com.profa.security.CurrentUser;
import com.profa.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final PasswordResetService passwords;
    private final JwtService jwt;
    private final UserDeletionService deletion;

    public ProfileController(UserRepository users, PasswordEncoder encoder, PasswordResetService passwords,
                             JwtService jwt, UserDeletionService deletion) {
        this.users = users; this.encoder = encoder; this.passwords = passwords; this.jwt = jwt; this.deletion = deletion;
    }

    public record ProfileResponse(
        UUID id,String email,String firstName,String lastName,String phone,
        Role role,boolean enabled,boolean verified
    ){}

    public record UpdateProfile(
        String firstName,String lastName,String phone
    ){}

    public record ChangePassword(String currentPassword, String newPassword) {}

    public record DeleteAccount(String password) {}

    private User current(Authentication auth){
        return users.findById(CurrentUser.id(auth)).orElseThrow(() -> CurrentUser.notFound("Compte"));
    }

    private ProfileResponse response(User u){
        return new ProfileResponse(
            u.getId(),u.getEmail(),u.getFirstName(),u.getLastName(),
            u.getPhone(),u.getRole(),u.isEnabled(),u.isVerified()
        );
    }

    @GetMapping
    public ProfileResponse me(Authentication auth){
        return response(current(auth));
    }

    @PatchMapping
    public ResponseEntity<?> update(@RequestBody UpdateProfile data, Authentication auth){
        User u=current(auth);
        if(data.firstName()!=null && !data.firstName().isBlank()) u.setFirstName(data.firstName().trim());
        if(data.lastName()!=null && !data.lastName().isBlank()) u.setLastName(data.lastName().trim());
        if(data.phone()!=null) u.setPhone(data.phone().trim());
        users.save(u);
        return ResponseEntity.ok(response(u));
    }

    /** Changes the password, revokes the other sessions and returns a fresh token for this one. */
    @PatchMapping("/password")
    public Map<String, String> changePassword(@RequestBody ChangePassword in, Authentication auth) {
        User u = current(auth);
        if (in.currentPassword() == null || !encoder.matches(in.currentPassword(), u.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe actuel incorrect");
        passwords.setPassword(u, in.newPassword());
        return Map.of("token", jwt.generate(u), "message", "Mot de passe modifié. Vos autres sessions ont été déconnectées.");
    }

    /** Self-service account deletion (password confirmation required). */
    @DeleteMapping
    public Map<String, String> deleteMe(@RequestBody DeleteAccount in, Authentication auth) {
        User u = current(auth);
        if (in.password() == null || !encoder.matches(in.password(), u.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe incorrect");
        if (u.getRole() == Role.ADMIN && users.countByRole(Role.ADMIN) <= 1)
            throw CurrentUser.badRequest("Le dernier administrateur ne peut pas supprimer son compte");
        deletion.delete(u.getId());
        return Map.of("message", "Compte supprimé.");
    }
}
