package com.profa.admin;

import com.profa.user.Role;
import com.profa.user.User;
import com.profa.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-admin.email:}")
    private String adminEmail;

    @Value("${app.bootstrap-admin.password:}")
    private String adminPassword;

    @Value("${app.bootstrap-admin.first-name:Admin}")
    private String firstName;

    @Value("${app.bootstrap-admin.last-name:PROFA}")
    private String lastName;

    public AdminBootstrap(
            UserRepository users,
            PasswordEncoder passwordEncoder
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {

        if (adminEmail == null || adminEmail.isBlank()
                || adminPassword == null || adminPassword.isBlank()) {

            System.out.println(
                    "[PROFA] Bootstrap ADMIN désactivé : "
                    + "APP_BOOTSTRAP_ADMIN_EMAIL/PASSWORD non configurés."
            );
            return;
        }

        String email = adminEmail.trim().toLowerCase();

        if (users.findByEmailIgnoreCase(email).isPresent()) {
            System.out.println(
                    "[PROFA] ADMIN déjà présent : " + email
            );
            return;
        }

        User admin = new User();

        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setFirstName(firstName);
        admin.setLastName(lastName);
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);
        admin.setVerified(true);

        users.save(admin);

        System.out.println(
                "[PROFA] Premier compte ADMIN créé : " + email
        );
    }
}