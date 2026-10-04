package com.profa.user;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {
    private final UserRepository users;

    public ProfileController(UserRepository users){this.users=users;}

    public record ProfileResponse(
        UUID id,String email,String firstName,String lastName,String phone,
        Role role,boolean enabled,boolean verified
    ){}

    public record UpdateProfile(
        String firstName,String lastName,String phone
    ){}

    private User current(Authentication auth){
        UUID id=UUID.fromString(auth.getName());
        return users.findById(id).orElseThrow();
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
}