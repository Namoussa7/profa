package com.profa.user;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/** Resolves user ids to display names ("Awa T.") without exposing contact details. */
@Component
public class UserNames {

    private final UserRepository users;

    public UserNames(UserRepository users) {
        this.users = users;
    }

    public static String display(User u) {
        if (u == null) return "Utilisateur";
        String last = u.getLastName() == null || u.getLastName().isBlank() ? "" : " " + u.getLastName().charAt(0) + ".";
        return u.getFirstName() + last;
    }

    public Map<UUID, String> of(Collection<UUID> ids) {
        Set<UUID> clean = ids.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (clean.isEmpty()) return Map.of();
        return users.findAllById(clean).stream().collect(Collectors.toMap(User::getId, UserNames::display));
    }

    public String of(UUID id) {
        return id == null ? "Utilisateur" : users.findById(id).map(UserNames::display).orElse("Utilisateur");
    }
}
