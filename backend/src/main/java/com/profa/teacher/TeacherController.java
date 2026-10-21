package com.profa.teacher;

import com.profa.common.PageResponse;
import com.profa.security.CurrentUser;
import com.profa.user.User;
import com.profa.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/teachers")
public class TeacherController {

    final TeacherRepository repo;
    final UserRepository users;

    public TeacherController(TeacherRepository r, UserRepository u) {
        repo = r; users = u;
    }

    /** Public view of a teacher: no address, no salary expectation, no e-mail/phone. */
    public record TeacherCard(UUID id, UUID userId, String firstName, String lastName, String headline, String bio,
                              String city, String district, Integer hourlyRate, boolean verified, Integer experienceYears,
                              String languages, String subjects, String levels, String teachingModes, boolean trialLessonFree,
                              String avatarUrl, String introVideoUrl, String availabilityJson,
                              double ratingAvg, long reviewCount, boolean documentsComplete) {}

    static TeacherCard card(TeacherProfile p, User u) {
        String first = u == null ? "Enseignant" : u.getFirstName();
        String lastInitial = u == null || u.getLastName() == null || u.getLastName().isBlank() ? "" : u.getLastName().charAt(0) + ".";
        return new TeacherCard(p.getId(), p.getUserId(), first, lastInitial, p.getHeadline(), p.getBio(),
                p.getCity(), p.getDistrict(), p.getHourlyRate(), p.isVerified(), p.getExperienceYears(), p.getLanguages(),
                p.getSubjects(), p.getLevels(), p.getTeachingModes(), p.isTrialLessonFree(), p.getAvatarUrl(),
                p.getIntroVideoUrl(), p.getAvailabilityJson(), Math.round(p.getRatingAvg() * 10) / 10.0, p.getReviewCount(),
                p.isDocumentsComplete());
    }

    static String like(String v) {
        return v == null || v.isBlank() ? "" : "%" + v.trim().toLowerCase(Locale.ROOT) + "%";
    }

    private static Sort sortOf(String sort) {
        return switch (sort) {
            case "price_asc" -> Sort.by(Sort.Order.asc("hourlyRate").nullsLast());
            case "price_desc" -> Sort.by(Sort.Order.desc("hourlyRate").nullsLast());
            case "rating" -> Sort.by(Sort.Order.desc("ratingAvg"), Sort.Order.desc("reviewCount"));
            case "experience" -> Sort.by(Sort.Order.desc("experienceYears").nullsLast());
            default -> Sort.by(Sort.Order.desc("verified"), Sort.Order.desc("ratingAvg"), Sort.Order.desc("reviewCount"), Sort.Order.desc("updatedAt"));
        };
    }

    /** Public, paginated search executed in the database. Cached 30 s by browsers/CDN. */
    @GetMapping
    public ResponseEntity<PageResponse<TeacherCard>> search(@RequestParam(required = false) String q,
                                                            @RequestParam(required = false) String subject,
                                                            @RequestParam(required = false) String level,
                                                            @RequestParam(required = false) String city,
                                                            @RequestParam(required = false) String mode,
                                                            @RequestParam(required = false) Integer minRate,
                                                            @RequestParam(required = false) Integer maxRate,
                                                            @RequestParam(defaultValue = "false") boolean verified,
                                                            @RequestParam(defaultValue = "false") boolean trial,
                                                            @RequestParam(defaultValue = "relevance") String sort,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(required = false) Integer size) {
        var result = repo.search(like(q), like(subject), like(level), like(city), like(mode),
                minRate == null ? -1 : minRate, maxRate == null ? -1 : maxRate, verified, trial,
                PageRequest.of(Math.max(page, 0), PageResponse.size(size, 12), sortOf(sort)));
        Map<UUID, User> byId = users.findAllById(result.getContent().stream().map(TeacherProfile::getUserId).toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(30, TimeUnit.SECONDS).cachePublic())
                .body(PageResponse.of(result, p -> card(p, byId.get(p.getUserId()))));
    }

    /** Profile id or user id. Incomplete profiles are only visible to their owner and admins. */
    @GetMapping("/{id}")
    public TeacherCard one(Authentication a, @PathVariable UUID id) {
        TeacherProfile p = repo.findById(id).or(() -> repo.findByUserId(id))
                .orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        User u = users.findById(p.getUserId()).orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        boolean privileged = a != null && a.isAuthenticated() && !"anonymousUser".equals(a.getName())
                && (CurrentUser.isAdmin(a) || a.getName().equals(p.getUserId().toString()));
        if (!privileged && (!u.isEnabled() || !p.isDocumentsComplete())) throw CurrentUser.notFound("Enseignant");
        return card(p, u);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('TEACHER')")
    public TeacherProfile me(Authentication a) {
        return repo.findByUserId(CurrentUser.id(a)).orElseGet(() -> {
            TeacherProfile p = new TeacherProfile();
            p.setUserId(CurrentUser.id(a));
            return repo.save(p);
        });
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('TEACHER')")
    public TeacherProfile update(Authentication a, @RequestBody TeacherProfile in) {
        TeacherProfile p = me(a);
        if (in.getHourlyRate() != null && in.getHourlyRate() < 0) throw CurrentUser.badRequest("Le tarif horaire doit être positif");
        if (in.getExperienceYears() != null && (in.getExperienceYears() < 0 || in.getExperienceYears() > 70))
            throw CurrentUser.badRequest("Années d'expérience invalides");
        p.setHeadline(in.getHeadline());
        p.setBio(in.getBio());
        p.setCity(in.getCity());
        p.setDistrict(in.getDistrict());
        p.setAddress(in.getAddress());
        p.setHourlyRate(in.getHourlyRate());
        p.setSalaryExpectation(in.getSalaryExpectation());
        p.setAvatarUrl(in.getAvatarUrl());
        p.setIntroVideoUrl(in.getIntroVideoUrl());
        p.setExperienceYears(in.getExperienceYears());
        p.setLanguages(in.getLanguages());
        p.setAvailabilityJson(in.getAvailabilityJson());
        p.setSubjects(in.getSubjects());
        p.setLevels(in.getLevels());
        p.setTeachingModes(in.getTeachingModes());
        p.setTrialLessonFree(in.isTrialLessonFree());
        p.setUpdatedAt(Instant.now());
        return repo.save(p);
    }
}
