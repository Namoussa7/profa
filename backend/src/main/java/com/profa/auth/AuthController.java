package com.profa.auth;

import com.profa.school.SchoolProfile;
import com.profa.school.SchoolRepository;
import com.profa.security.JwtService;
import com.profa.teacher.TeacherProfile;
import com.profa.teacher.TeacherRepository;
import com.profa.user.Role;
import com.profa.user.User;
import com.profa.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final TeacherRepository teachers;
    private final SchoolRepository schools;

    public AuthController(UserRepository u, PasswordEncoder e, JwtService j, TeacherRepository t, SchoolRepository s) {
        users = u; encoder = e; jwt = j; teachers = t; schools = s;
    }

    public record Register(@Email @NotBlank String email,
                           @NotBlank @Size(min = 8, max = 128) String password,
                           @NotBlank @Size(max = 100) String firstName,
                           @NotBlank @Size(max = 100) String lastName,
                           @Size(max = 50) String phone,
                           @NotNull Role role) {}

    public record Login(@Email @NotBlank String email, @NotBlank String password) {}

    public record AuthResponse(String token, UUID id, String email, String role, String firstName, String lastName) {}

    private AuthResponse response(User u) {
        return new AuthResponse(jwt.generate(u), u.getId(), u.getEmail(), u.getRole().name(), u.getFirstName(), u.getLastName());
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@Valid @RequestBody Register r) {
        if (r.role() == Role.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("message", "La création de comptes administrateur est restreinte"));
        }
        String email = r.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("message", "Cette adresse e-mail est déjà utilisée"));
        }
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(r.password()));
        u.setFirstName(r.firstName().trim());
        u.setLastName(r.lastName().trim());
        u.setPhone(r.phone() == null ? null : r.phone().trim());
        u.setRole(r.role());
        users.save(u);
        if (r.role() == Role.TEACHER) {
            TeacherProfile p = new TeacherProfile();
            p.setUserId(u.getId());
            teachers.save(p);
        }
        if (r.role() == Role.SCHOOL) {
            SchoolProfile p = new SchoolProfile();
            p.setUserId(u.getId());
            schools.save(p);
        }
        return ResponseEntity.ok(response(u));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody Login r) {
        // Same message for unknown e-mail and wrong password: do not reveal which accounts exist.
        User u = users.findByEmailIgnoreCase(r.email().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou mot de passe incorrect"));
        if (!encoder.matches(r.password(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou mot de passe incorrect");
        }
        if (!u.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce compte a été désactivé. Contactez le support Profa.");
        }
        return response(u);
    }
}
