package com.profa.review;

import com.profa.booking.Booking;
import com.profa.booking.BookingRepository;
import com.profa.notification.NotificationService;
import com.profa.security.CurrentUser;
import com.profa.user.UserNames;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {

    final ReviewRepository r;
    final BookingRepository bookings;
    final NotificationService notifications;
    final UserNames names;
    final RatingService ratings;

    public ReviewController(ReviewRepository r, BookingRepository b, NotificationService n, UserNames names, RatingService ratings) {
        this.r = r; bookings = b; notifications = n; this.names = names; this.ratings = ratings;
    }

    public record ReviewView(UUID id, String authorName, int rating, String comment, Instant createdAt) {}

    public record CreateReview(UUID bookingId, int rating, String comment) {}

    /** Public: reviews of a teacher (teacher user id). */
    @GetMapping("/teacher/{teacherId}")
    public List<ReviewView> byTeacher(@PathVariable UUID teacherId) {
        List<Review> list = r.findByTeacherIdOrderByCreatedAtDesc(teacherId);
        Map<UUID, String> n = names.of(list.stream().map(Review::getAuthorId).toList());
        return list.stream().map(x -> new ReviewView(x.getId(), n.getOrDefault(x.getAuthorId(), "Parent"),
                x.getRating(), x.getComment(), x.getCreatedAt())).toList();
    }

    /** Verified reviews only: the author must be the parent of a COMPLETED booking, one review per booking. */
    @PostMapping
    @PreAuthorize("hasRole('PARENT')")
    public Review create(Authentication a, @RequestBody CreateReview in) {
        UUID me = CurrentUser.id(a);
        if (in.rating() < 1 || in.rating() > 5) throw CurrentUser.badRequest("La note doit être comprise entre 1 et 5");
        if (in.bookingId() == null) throw CurrentUser.badRequest("Réservation requise");
        Booking b = bookings.findById(in.bookingId()).orElseThrow(() -> CurrentUser.notFound("Réservation"));
        if (!me.equals(b.getParentId())) throw CurrentUser.forbidden();
        if (!"COMPLETED".equals(b.getStatus())) throw CurrentUser.badRequest("Vous pourrez laisser un avis après le cours");
        if (r.existsByBookingId(b.getId())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous avez déjà noté ce cours");
        Review x = new Review();
        x.setBookingId(b.getId());
        x.setAuthorId(me);
        x.setTeacherId(b.getTeacherId());
        x.setRating(in.rating());
        x.setComment(in.comment() == null ? null : in.comment().trim());
        Review saved = r.save(x);
        ratings.refresh(b.getTeacherId());
        notifications.notify(b.getTeacherId(), "REVIEW", "Nouvel avis " + "★".repeat(in.rating()),
                names.of(me) + " a laissé un avis sur votre cours.", "/dashboard");
        return saved;
    }
}
