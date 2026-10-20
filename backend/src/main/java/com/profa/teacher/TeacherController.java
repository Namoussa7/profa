package com.profa.teacher;

import com.profa.review.Review;
import com.profa.review.ReviewRepository;
import com.profa.security.CurrentUser;
import com.profa.user.User;
import com.profa.user.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/teachers")
public class TeacherController {

    final TeacherRepository repo;
    final UserRepository users;
    final ReviewRepository reviews;

    public TeacherController(TeacherRepository r, UserRepository u, ReviewRepository rv) {
        repo = r; users = u; reviews = rv;
    }

    /** Public view of a teacher: no address, no salary expectation, no e-mail/phone. */
    public record TeacherCard(UUID id, UUID userId, String firstName, String lastName, String headline, String bio,
                              String city, String district, Integer hourlyRate, boolean verified, Integer experienceYears,
                              String languages, String subjects, String levels, String teachingModes, boolean trialLessonFree,
                              String avatarUrl, String introVideoUrl, String availabilityJson,
                              double ratingAvg, long reviewCount) {}

    private record Rating(double avg, long count) {}

    private Map<UUID, Rating> ratings() {
        return reviews.findAll().stream().filter(r -> r.getTeacherId() != null)
                .collect(Collectors.groupingBy(Review::getTeacherId,
                        Collectors.collectingAndThen(Collectors.toList(), l -> new Rating(
                                l.stream().mapToInt(Review::getRating).average().orElse(0), l.size()))));
    }

    private TeacherCard card(TeacherProfile p, User u, Rating rating) {
        String lastInitial = u.getLastName() == null || u.getLastName().isBlank() ? "" : u.getLastName().charAt(0) + ".";
        Rating r = rating == null ? new Rating(0, 0) : rating;
        return new TeacherCard(p.getId(), p.getUserId(), u.getFirstName(), lastInitial, p.getHeadline(), p.getBio(),
                p.getCity(), p.getDistrict(), p.getHourlyRate(), p.isVerified(), p.getExperienceYears(), p.getLanguages(),
                p.getSubjects(), p.getLevels(), p.getTeachingModes(), p.isTrialLessonFree(), p.getAvatarUrl(),
                p.getIntroVideoUrl(), p.getAvailabilityJson(), Math.round(r.avg() * 10) / 10.0, r.count());
    }

    private static boolean contains(String haystack, String needle) {
        return haystack != null && haystack.toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    @GetMapping
    public List<TeacherCard> search(@RequestParam(required = false) String q,
                                    @RequestParam(required = false) String subject,
                                    @RequestParam(required = false) String level,
                                    @RequestParam(required = false) String city,
                                    @RequestParam(required = false) String mode,
                                    @RequestParam(required = false) Integer minRate,
                                    @RequestParam(required = false) Integer maxRate,
                                    @RequestParam(defaultValue = "false") boolean verified,
                                    @RequestParam(defaultValue = "false") boolean trial,
                                    @RequestParam(defaultValue = "relevance") String sort) {
        Map<UUID, User> byId = users.findAll().stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<UUID, Rating> rt = ratings();
        Comparator<TeacherCard> order = switch (sort) {
            case "price_asc" -> Comparator.comparing((TeacherCard c) -> c.hourlyRate() == null ? Integer.MAX_VALUE : c.hourlyRate());
            case "price_desc" -> Comparator.comparing((TeacherCard c) -> c.hourlyRate() == null ? 0 : c.hourlyRate()).reversed();
            case "rating" -> Comparator.comparingDouble(TeacherCard::ratingAvg).thenComparingLong(TeacherCard::reviewCount).reversed();
            case "experience" -> Comparator.comparing((TeacherCard c) -> c.experienceYears() == null ? 0 : c.experienceYears()).reversed();
            // relevance: verified first, then best rated, then most reviewed
            default -> Comparator.comparing(TeacherCard::verified).thenComparingDouble(TeacherCard::ratingAvg)
                    .thenComparingLong(TeacherCard::reviewCount).reversed();
        };
        return repo.findAll().stream()
                .filter(p -> byId.containsKey(p.getUserId()) && byId.get(p.getUserId()).isEnabled())
                .filter(p -> !verified || p.isVerified())
                .filter(p -> !trial || p.isTrialLessonFree())
                .filter(p -> city == null || city.isBlank() || contains(p.getCity(), city.trim()) || contains(p.getDistrict(), city.trim()))
                .filter(p -> subject == null || subject.isBlank() || contains(p.getSubjects(), subject.trim()))
                .filter(p -> level == null || level.isBlank() || contains(p.getLevels(), level.trim()))
                .filter(p -> mode == null || mode.isBlank() || contains(p.getTeachingModes(), mode.trim()))
                .filter(p -> minRate == null || (p.getHourlyRate() != null && p.getHourlyRate() >= minRate))
                .filter(p -> maxRate == null || (p.getHourlyRate() != null && p.getHourlyRate() <= maxRate))
                .filter(p -> q == null || q.isBlank() || contains(p.getHeadline(), q.trim()) || contains(p.getBio(), q.trim())
                        || contains(p.getSubjects(), q.trim()) || contains(byId.get(p.getUserId()).getFirstName(), q.trim()))
                .map(p -> card(p, byId.get(p.getUserId()), rt.get(p.getUserId())))
                .sorted(order)
                .toList();
    }

    @GetMapping("/{id}")
    public TeacherCard one(@PathVariable UUID id) {
        // Accept either the profile id or the teacher's user id.
        TeacherProfile p = repo.findById(id).or(() -> repo.findByUserId(id))
                .orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        User u = users.findById(p.getUserId()).filter(User::isEnabled)
                .orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        return card(p, u, ratings().get(p.getUserId()));
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
