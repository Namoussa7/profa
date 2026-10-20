package com.profa.booking;

import com.profa.course.CourseRequest;
import com.profa.course.CourseRequestRepository;
import com.profa.notification.NotificationService;
import com.profa.review.ReviewRepository;
import com.profa.security.CurrentUser;
import com.profa.teacher.TeacherProfile;
import com.profa.teacher.TeacherRepository;
import com.profa.user.UserNames;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {

    static final Set<String> MODES = Set.of("ONLINE", "HOME", "CENTER");

    final BookingRepository r;
    final TeacherRepository teachers;
    final CourseRequestRepository requests;
    final ReviewRepository reviews;
    final NotificationService notifications;
    final UserNames names;

    public BookingController(BookingRepository r, TeacherRepository t, CourseRequestRepository c,
                             ReviewRepository rv, NotificationService n, UserNames names) {
        this.r = r; teachers = t; requests = c; reviews = rv; notifications = n; this.names = names;
    }

    public record CreateBooking(UUID teacherId, UUID courseRequestId, LocalDateTime startsAt, LocalDateTime endsAt,
                                String mode, String address, String meetingUrl) {}

    private List<Booking> enrich(List<Booking> list) {
        Map<UUID, String> n = names.of(list.stream().flatMap(b -> Stream.of(b.getParentId(), b.getTeacherId())).toList());
        list.forEach(b -> {
            b.setParentName(n.getOrDefault(b.getParentId(), "Parent"));
            b.setTeacherName(n.getOrDefault(b.getTeacherId(), "Enseignant"));
            b.setReviewed(reviews.existsByBookingId(b.getId()));
        });
        return list;
    }

    /** Only the parent's or the teacher's own bookings (admins see everything in /admin/bookings). */
    @GetMapping
    public List<Booking> mine(Authentication a) {
        UUID me = CurrentUser.id(a);
        if (CurrentUser.hasRole(a, "TEACHER")) return enrich(r.findByTeacherIdOrderByStartsAtDesc(me));
        if (CurrentUser.isAdmin(a)) return enrich(r.findAll());
        return enrich(r.findByParentIdOrderByStartsAtDesc(me));
    }

    @PostMapping
    @PreAuthorize("hasRole('PARENT')")
    public Booking create(Authentication a, @RequestBody CreateBooking in) {
        UUID me = CurrentUser.id(a);
        UUID teacherId = in.teacherId();
        if (in.courseRequestId() != null) {
            CourseRequest cr = requests.findById(in.courseRequestId()).orElseThrow(() -> CurrentUser.notFound("Demande"));
            if (!me.equals(cr.getParentId())) throw CurrentUser.forbidden();
            if (teacherId == null) teacherId = cr.getTeacherId();
        }
        if (teacherId == null) throw CurrentUser.badRequest("Enseignant requis");
        TeacherProfile teacher = teachers.findByUserId(teacherId).orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        if (in.startsAt() == null || in.endsAt() == null || !in.endsAt().isAfter(in.startsAt()))
            throw CurrentUser.badRequest("Créneau invalide : la fin doit être après le début");
        if (in.startsAt().isBefore(LocalDateTime.now())) throw CurrentUser.badRequest("Le créneau doit être dans le futur");
        long minutes = Duration.between(in.startsAt(), in.endsAt()).toMinutes();
        if (minutes > 8 * 60) throw CurrentUser.badRequest("Un cours ne peut pas dépasser 8 heures");
        String mode = in.mode() == null ? "ONLINE" : in.mode().toUpperCase(Locale.ROOT);
        if (!MODES.contains(mode)) throw CurrentUser.badRequest("Mode de cours invalide");

        final UUID tid = teacherId;
        boolean overlap = r.findByTeacherIdOrderByStartsAtDesc(tid).stream()
                .filter(b -> !"CANCELLED".equals(b.getStatus()))
                .anyMatch(b -> b.getStartsAt() != null && b.getEndsAt() != null
                        && b.getStartsAt().isBefore(in.endsAt()) && in.startsAt().isBefore(b.getEndsAt()));
        if (overlap) throw new ResponseStatusException(HttpStatus.CONFLICT, "L'enseignant n'est pas disponible sur ce créneau");

        Booking b = new Booking();
        b.setParentId(me);
        b.setTeacherId(tid);
        b.setCourseRequestId(in.courseRequestId());
        b.setStartsAt(in.startsAt());
        b.setEndsAt(in.endsAt());
        b.setMode(mode);
        b.setAddress(in.address());
        b.setMeetingUrl(in.meetingUrl());
        // Price is computed server side from the teacher's hourly rate (never trusted from the client).
        int rate = teacher.getHourlyRate() == null ? 0 : teacher.getHourlyRate();
        b.setAmount((int) Math.round(rate * minutes / 60.0));
        Booking saved = r.save(b);
        notifications.notify(tid, "BOOKING", "Nouvelle réservation",
                names.of(me) + " a réservé un cours le " + in.startsAt().toLocalDate(), "/dashboard");
        return saved;
    }

    @PatchMapping("/{id}/status")
    public Booking status(Authentication a, @PathVariable UUID id, @RequestParam String value) {
        UUID me = CurrentUser.id(a);
        Booking b = r.findById(id).orElseThrow(() -> CurrentUser.notFound("Réservation"));
        String next = value.toUpperCase(Locale.ROOT);
        boolean isTeacher = me.equals(b.getTeacherId());
        boolean isParent = me.equals(b.getParentId());
        boolean allowed = CurrentUser.isAdmin(a)
                || (isTeacher && Set.of("CONFIRMED", "COMPLETED", "CANCELLED").contains(next))
                || (isParent && "CANCELLED".equals(next));
        if (!allowed) throw CurrentUser.forbidden();
        if ("COMPLETED".equals(b.getStatus()) && "CANCELLED".equals(next))
            throw CurrentUser.badRequest("Un cours terminé ne peut pas être annulé");
        b.setStatus(next);
        Booking saved = r.save(b);
        UUID other = isTeacher ? b.getParentId() : b.getTeacherId();
        String label = switch (next) {
            case "CONFIRMED" -> "confirmée";
            case "COMPLETED" -> "marquée comme terminée — laissez un avis !";
            case "CANCELLED" -> "annulée";
            default -> next.toLowerCase(Locale.ROOT);
        };
        notifications.notify(other, "BOOKING", "Réservation " + label.split(" ")[0], "Votre réservation a été " + label, "/dashboard");
        return saved;
    }
}
