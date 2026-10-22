package com.profa.admin;

import com.profa.auth.PasswordResetService;
import com.profa.booking.*;
import com.profa.certification.CertificationService;
import com.profa.common.MailService;
import com.profa.common.PageResponse;
import com.profa.course.*;
import com.profa.document.*;
import com.profa.job.*;
import com.profa.notification.NotificationService;
import com.profa.payment.*;
import com.profa.review.*;
import com.profa.school.*;
import com.profa.security.CurrentUser;
import com.profa.security.UserStatusCache;
import com.profa.teacher.*;
import com.profa.user.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    final UserRepository users;
    final TeacherRepository teachers;
    final SchoolRepository schools;
    final TeacherDocumentRepository docs;
    final DocumentService documents;
    final JobRepository jobs;
    final ApplicationRepository applications;
    final BookingRepository bookings;
    final PaymentRepository payments;
    final PaymentService paymentService;
    final ReviewRepository reviews;
    final RatingService ratings;
    final CourseRequestRepository courseRequests;
    final NotificationService notifications;
    final AuditLogRepository audit;
    final UserDeletionService deletion;
    final PasswordResetService resets;
    final PasswordEncoder encoder;
    final MailService mail;
    final UserStatusCache status;
    final UserNames names;
    final CertificationService certification;

    public AdminController(UserRepository users, TeacherRepository teachers, SchoolRepository schools,
                           TeacherDocumentRepository docs, DocumentService documents, JobRepository jobs,
                           ApplicationRepository applications, BookingRepository bookings, PaymentRepository payments,
                           PaymentService paymentService, ReviewRepository reviews, RatingService ratings,
                           CourseRequestRepository courseRequests, NotificationService notifications,
                           AuditLogRepository audit, UserDeletionService deletion, PasswordResetService resets,
                           PasswordEncoder encoder, MailService mail, UserStatusCache status, UserNames names,
                           CertificationService certification) {
        this.users = users; this.teachers = teachers; this.schools = schools; this.docs = docs; this.documents = documents;
        this.jobs = jobs; this.applications = applications; this.bookings = bookings; this.payments = payments;
        this.paymentService = paymentService; this.reviews = reviews; this.ratings = ratings;
        this.courseRequests = courseRequests; this.notifications = notifications; this.audit = audit;
        this.deletion = deletion; this.resets = resets; this.encoder = encoder; this.mail = mail;
        this.status = status; this.names = names; this.certification = certification;
    }

    // ---------------------------------------------------------------- helpers

    private void log(Authentication a, String action, String type, UUID target, String details) {
        AuditLog l = new AuditLog();
        l.setAdminId(CurrentUser.id(a));
        l.setAction(action);
        l.setTargetType(type);
        l.setTargetId(target);
        l.setDetails(details);
        audit.save(l);
    }

    private static Pageable page(int page, Integer size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), PageResponse.size(size, 20), sort);
    }

    private static String like(String v) {
        return v == null || v.isBlank() ? "" : "%" + v.trim().toLowerCase(Locale.ROOT) + "%";
    }

    private static String up(String v) {
        return v == null ? "" : v.trim().toUpperCase(Locale.ROOT);
    }

    private User user(UUID id) {
        return users.findById(id).orElseThrow(() -> CurrentUser.notFound("Utilisateur"));
    }

    private void notLastAdmin(User u) {
        if (u.getRole() == Role.ADMIN && users.countByRole(Role.ADMIN) <= 1)
            throw CurrentUser.badRequest("Impossible : c'est le dernier administrateur");
    }

    // ---------------------------------------------------------------- dashboard

    /** Counts are computed by the database (no full table loads). */
    @GetMapping("/stats")
    public Map<String, Object> stats() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("users", users.count());
        r.put("activeUsers", users.countByEnabledTrue());
        r.put("parents", users.countByRole(Role.PARENT));
        r.put("teachers", teachers.count());
        r.put("teachersPublic", teachers.countByDocumentsCompleteTrue());
        r.put("schools", schools.count());
        r.put("admins", users.countByRole(Role.ADMIN));
        r.put("pendingTeachers", teachers.countByVerifiedFalse());
        r.put("pendingDocuments", docs.countByStatus("PENDING"));
        r.put("jobs", jobs.count());
        r.put("openJobs", jobs.countByStatus("OPEN"));
        r.put("applications", applications.count());
        r.put("courseRequests", courseRequests.count());
        r.put("courseRequestsPending", courseRequests.countByStatus("PENDING"));
        r.put("bookings", bookings.count());
        r.put("pendingBookings", bookings.countByStatus("PENDING_PAYMENT"));
        r.put("payments", payments.count());
        r.put("pendingPayments", payments.countByStatus("PENDING"));
        r.put("reviews", reviews.count());
        r.put("mailEnabled", mail.enabled());
        return r;
    }

    // ---------------------------------------------------------------- users

    public record CreateUser(String email, String firstName, String lastName, String phone, Role role) {}

    public record UpdateUser(String email, String firstName, String lastName, String phone) {}

    @GetMapping("/users")
    public PageResponse<User> users(@RequestParam(required = false) String q, @RequestParam(required = false) String role,
                                    @RequestParam(required = false) String status,
                                    @RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        return PageResponse.of(users.search(like(q), up(role), up(status), page(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    /** Creates any account (including another admin); the person sets their password through the returned link. */
    @PostMapping("/users")
    @Transactional
    public Map<String, Object> create(Authentication a, @RequestBody CreateUser in) {
        if (in.email() == null || !in.email().contains("@")) throw CurrentUser.badRequest("E-mail invalide");
        if (in.firstName() == null || in.firstName().isBlank() || in.lastName() == null || in.lastName().isBlank())
            throw CurrentUser.badRequest("Prénom et nom requis");
        if (in.role() == null) throw CurrentUser.badRequest("Rôle requis");
        String email = in.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByEmailIgnoreCase(email).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette adresse e-mail est déjà utilisée");
        User u = new User();
        u.setEmail(email);
        u.setFirstName(in.firstName().trim());
        u.setLastName(in.lastName().trim());
        u.setPhone(in.phone());
        u.setRole(in.role());
        u.setVerified(true);
        byte[] random = new byte[24];
        new SecureRandom().nextBytes(random);
        u.setPasswordHash(encoder.encode(Base64.getEncoder().encodeToString(random)));
        users.save(u);
        if (in.role() == Role.TEACHER) { TeacherProfile p = new TeacherProfile(); p.setUserId(u.getId()); teachers.save(p); }
        if (in.role() == Role.SCHOOL) { SchoolProfile p = new SchoolProfile(); p.setUserId(u.getId()); schools.save(p); }
        var link = resets.createLink(u);
        mail.send(u.getEmail(), "Profa — Votre compte a été créé",
                "Bonjour " + u.getFirstName() + ",\n\nUn compte Profa a été créé pour vous. Choisissez votre mot de passe ici "
                        + "(lien valable 60 minutes) :\n\n" + link.link() + "\n\nL'équipe Profa");
        log(a, "USER_CREATE", "USER", u.getId(), email + " (" + in.role() + ")");
        return Map.of("user", u, "resetLink", link.link(), "expiresAt", link.expiresAt(), "emailed", mail.enabled());
    }

    @PutMapping("/users/{id}")
    public User update(Authentication a, @PathVariable UUID id, @RequestBody UpdateUser in) {
        User u = user(id);
        if (in.email() != null && !in.email().isBlank() && !in.email().equalsIgnoreCase(u.getEmail())) {
            String email = in.email().trim().toLowerCase(Locale.ROOT);
            if (!email.contains("@")) throw CurrentUser.badRequest("E-mail invalide");
            if (users.findByEmailIgnoreCase(email).isPresent())
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette adresse e-mail est déjà utilisée");
            u.setEmail(email);
        }
        if (in.firstName() != null && !in.firstName().isBlank()) u.setFirstName(in.firstName().trim());
        if (in.lastName() != null && !in.lastName().isBlank()) u.setLastName(in.lastName().trim());
        if (in.phone() != null) u.setPhone(in.phone().trim());
        log(a, "USER_UPDATE", "USER", id, u.getEmail());
        return users.save(u);
    }

    @PatchMapping("/users/{id}/enabled")
    public User setUserEnabled(Authentication a, @PathVariable UUID id, @RequestParam boolean enabled) {
        if (!enabled && CurrentUser.id(a).equals(id)) throw CurrentUser.badRequest("Vous ne pouvez pas bloquer votre propre compte");
        User u = user(id);
        if (!enabled) notLastAdmin(u);
        u.setEnabled(enabled);
        User saved = users.save(u);
        status.evict(id);
        log(a, enabled ? "USER_ENABLE" : "USER_BLOCK", "USER", id, u.getEmail());
        return saved;
    }

    @PatchMapping("/users/{id}/verified")
    public User setUserVerified(Authentication a, @PathVariable UUID id, @RequestParam boolean verified) {
        User u = user(id);
        u.setVerified(verified);
        log(a, verified ? "USER_VERIFY" : "USER_UNVERIFY", "USER", id, u.getEmail());
        return users.save(u);
    }

    @PatchMapping("/users/{id}/role")
    @Transactional
    public User setRole(Authentication a, @PathVariable UUID id, @RequestParam Role role) {
        if (CurrentUser.id(a).equals(id)) throw CurrentUser.badRequest("Vous ne pouvez pas changer votre propre rôle");
        User u = user(id);
        if (u.getRole() == role) return u;
        notLastAdmin(u);
        Role old = u.getRole();
        u.setRole(role);
        if (role == Role.TEACHER && teachers.findByUserId(id).isEmpty()) { TeacherProfile p = new TeacherProfile(); p.setUserId(id); teachers.save(p); }
        if (role == Role.SCHOOL && schools.findByUserId(id).isEmpty()) { SchoolProfile p = new SchoolProfile(); p.setUserId(id); schools.save(p); }
        // Existing tokens carry the old role: force a new login.
        u.setPasswordChangedAt(Instant.now());
        User saved = users.save(u);
        status.evict(id);
        log(a, "USER_ROLE", "USER", id, old + " → " + role);
        return saved;
    }

    /** Link to hand to the user (WhatsApp, SMS…), also e-mailed when SMTP is configured. */
    @PostMapping("/users/{id}/reset-link")
    public Map<String, Object> resetLink(Authentication a, @PathVariable UUID id) {
        User u = user(id);
        var link = resets.createLink(u);
        mail.send(u.getEmail(), "Profa — Réinitialisation de votre mot de passe",
                "Bonjour " + u.getFirstName() + ",\n\nUn administrateur Profa vous envoie un lien pour choisir un nouveau mot de passe "
                        + "(valable 60 minutes) :\n\n" + link.link() + "\n\nL'équipe Profa");
        log(a, "USER_RESET_LINK", "USER", id, u.getEmail());
        return Map.of("link", link.link(), "expiresAt", link.expiresAt(), "emailed", mail.enabled());
    }

    @DeleteMapping("/users/{id}")
    public Map<String, String> delete(Authentication a, @PathVariable UUID id) {
        if (CurrentUser.id(a).equals(id)) throw CurrentUser.badRequest("Vous ne pouvez pas supprimer votre propre compte ici");
        User u = user(id);
        notLastAdmin(u);
        String label = u.getEmail() + " (" + u.getRole() + ")";
        deletion.delete(id);
        log(a, "USER_DELETE", "USER", id, label);
        return Map.of("status", "deleted");
    }

    // ---------------------------------------------------------------- teachers & documents

    public record AdminTeacher(UUID id, UUID userId, String name, String email, String phone, String headline, String city,
                               Integer hourlyRate, Integer experienceYears, boolean verified, boolean documentsComplete,
                               double ratingAvg, int reviewCount, boolean enabled) {}

    @GetMapping("/teachers")
    public PageResponse<AdminTeacher> teachers(@RequestParam(required = false) String q, @RequestParam(required = false) String filter,
                                               @RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        Page<TeacherProfile> p = teachers.adminSearch(like(q), up(filter), page(page, size, Sort.by(Sort.Direction.DESC, "updatedAt")));
        Map<UUID, User> byId = users.findAllById(p.getContent().stream().map(TeacherProfile::getUserId).toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return PageResponse.of(p, t -> {
            User u = byId.get(t.getUserId());
            return new AdminTeacher(t.getId(), t.getUserId(), u == null ? "—" : u.getFirstName() + " " + u.getLastName(),
                    u == null ? null : u.getEmail(), u == null ? null : u.getPhone(), t.getHeadline(), t.getCity(),
                    t.getHourlyRate(), t.getExperienceYears(), t.isVerified(), t.isDocumentsComplete(),
                    t.getRatingAvg(), t.getReviewCount(), u != null && u.isEnabled());
        });
    }

    @PatchMapping("/teachers/{id}/verify")
    public TeacherProfile verify(Authentication a, @PathVariable UUID id) {
        TeacherProfile p = teachers.findById(id).orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        if (!p.isDocumentsComplete()) throw CurrentUser.badRequest("Le CV et le diplôme PDF doivent d'abord être envoyés");
        p.setVerified(true);
        TeacherProfile saved = teachers.save(p);
        users.findById(p.getUserId()).ifPresent(u -> { u.setVerified(true); users.save(u); });
        notifications.notify(p.getUserId(), "VERIFICATION", "Profil vérifié",
                "Votre profil enseignant est désormais vérifié et mis en avant dans la recherche.", "/enseignants/" + p.getId());
        log(a, "TEACHER_VERIFY", "TEACHER", id, null);
        certification.refresh(p.getUserId());
        return saved;
    }

    @PatchMapping("/teachers/{id}/unverify")
    public TeacherProfile unverify(Authentication a, @PathVariable UUID id) {
        TeacherProfile p = teachers.findById(id).orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        p.setVerified(false);
        log(a, "TEACHER_UNVERIFY", "TEACHER", id, null);
        TeacherProfile saved = teachers.save(p);
        certification.refresh(p.getUserId());
        return saved;
    }

    @GetMapping("/documents")
    public PageResponse<TeacherDocument> documents(@RequestParam(required = false) String status,
                                                   @RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        Pageable pg = page(page, size, Sort.unsorted());
        Page<TeacherDocument> p = status == null || status.isBlank() ? docs.findAllByOrderByCreatedAtDesc(pg)
                : docs.findByStatusOrderByCreatedAtDesc(up(status), pg);
        Map<UUID, String> n = names.of(p.getContent().stream().map(TeacherDocument::getTeacherId).toList());
        p.getContent().forEach(d -> {
            d.setTeacherName(n.getOrDefault(d.getTeacherId(), "Enseignant"));
            d.setTeacherProfileId(teachers.findByUserId(d.getTeacherId()).map(TeacherProfile::getId).orElse(null));
        });
        return PageResponse.of(p);
    }

    @PatchMapping("/documents/{id}")
    public TeacherDocument document(Authentication a, @PathVariable UUID id, @RequestParam String status,
                                    @RequestParam(required = false) String reason) {
        TeacherDocument d = documents.review(id, status, reason);
        log(a, "DOCUMENT_" + up(status), "DOCUMENT", id, d.getType() + (reason == null ? "" : " — " + reason));
        return d;
    }

    // ---------------------------------------------------------------- schools, jobs, requests

    @GetMapping("/schools")
    public PageResponse<SchoolProfile> allSchools(@RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        return PageResponse.of(schools.findAll(page(page, size, Sort.by("name"))));
    }

    @GetMapping("/jobs")
    public PageResponse<JobOffer> allJobs(@RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        Page<JobOffer> p = jobs.findAll(page(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        p.getContent().forEach(j -> j.setApplicationsCount(applications.countByJobId(j.getId())));
        return PageResponse.of(p);
    }

    @PatchMapping("/jobs/{id}/status")
    public JobOffer setJobStatus(Authentication a, @PathVariable UUID id, @RequestParam String status) {
        JobOffer job = jobs.findById(id).orElseThrow(() -> CurrentUser.notFound("Offre"));
        String next = up(status);
        if (!Set.of("OPEN", "CLOSED").contains(next)) throw CurrentUser.badRequest("Statut invalide");
        job.setStatus(next);
        log(a, "JOB_" + next, "JOB", id, job.getTitle());
        return jobs.save(job);
    }

    @DeleteMapping("/jobs/{id}")
    @Transactional
    public Map<String, String> deleteJob(Authentication a, @PathVariable UUID id) {
        JobOffer job = jobs.findById(id).orElseThrow(() -> CurrentUser.notFound("Offre"));
        applications.deleteAll(applications.findByJobId(id));
        jobs.delete(job);
        log(a, "JOB_DELETE", "JOB", id, job.getTitle());
        return Map.of("status", "deleted");
    }

    @GetMapping("/applications")
    public PageResponse<Application> allApplications(@RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        return PageResponse.of(applications.findAll(page(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    @PatchMapping("/applications/{id}/status")
    public Application setApplicationStatus(Authentication a, @PathVariable UUID id, @RequestParam String status) {
        Application application = applications.findById(id).orElseThrow(() -> CurrentUser.notFound("Candidature"));
        application.setStatus(up(status));
        log(a, "APPLICATION_STATUS", "APPLICATION", id, up(status));
        return applications.save(application);
    }

    @GetMapping("/course-requests")
    public PageResponse<CourseRequest> allCourseRequests(@RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        Page<CourseRequest> p = courseRequests.findAll(page(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        Map<UUID, String> n = names.of(p.getContent().stream().flatMap(c -> Stream.of(c.getParentId(), c.getTeacherId())).toList());
        p.getContent().forEach(c -> { c.setParentName(n.get(c.getParentId())); c.setTeacherName(n.get(c.getTeacherId())); });
        return PageResponse.of(p);
    }

    // ---------------------------------------------------------------- bookings & payments

    @GetMapping("/bookings")
    public PageResponse<Booking> allBookings(@RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        Page<Booking> p = bookings.findAll(page(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        Map<UUID, String> n = names.of(p.getContent().stream().flatMap(b -> Stream.of(b.getParentId(), b.getTeacherId())).toList());
        p.getContent().forEach(b -> { b.setParentName(n.getOrDefault(b.getParentId(), "Utilisateur")); b.setTeacherName(n.getOrDefault(b.getTeacherId(), "Utilisateur")); });
        return PageResponse.of(p);
    }

    @PatchMapping("/bookings/{id}/status")
    public Booking setBookingStatus(Authentication a, @PathVariable UUID id, @RequestParam String status) {
        Booking booking = bookings.findById(id).orElseThrow(() -> CurrentUser.notFound("Réservation"));
        String next = up(status);
        if (!Set.of("PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED").contains(next)) throw CurrentUser.badRequest("Statut invalide");
        booking.setStatus(next);
        log(a, "BOOKING_" + next, "BOOKING", id, null);
        return bookings.save(booking);
    }

    @GetMapping("/payments")
    public PageResponse<Payment> allPayments(@RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        return PageResponse.of(payments.findAll(page(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    @PatchMapping("/payments/{id}/status")
    public Payment setPaymentStatus(Authentication a, @PathVariable UUID id, @RequestParam String status) {
        Payment payment = payments.findById(id).orElseThrow(() -> CurrentUser.notFound("Paiement"));
        log(a, "PAYMENT_" + up(status), "PAYMENT", id, payment.getExternalReference());
        return paymentService.apply(payment, status);
    }

    // ---------------------------------------------------------------- reviews (moderation)

    public record AdminReview(UUID id, String authorName, String teacherName, int rating, String comment, Instant createdAt) {}

    @GetMapping("/reviews")
    public PageResponse<AdminReview> allReviews(@RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        Page<Review> p = reviews.findAllByOrderByCreatedAtDesc(page(page, size, Sort.unsorted()));
        Map<UUID, String> n = names.of(p.getContent().stream().flatMap(r -> Stream.of(r.getAuthorId(), r.getTeacherId())).toList());
        return PageResponse.of(p, r -> new AdminReview(r.getId(), n.getOrDefault(r.getAuthorId(), "Utilisateur"),
                n.getOrDefault(r.getTeacherId(), "Utilisateur"), r.getRating(), r.getComment(), r.getCreatedAt()));
    }

    @DeleteMapping("/reviews/{id}")
    public Map<String, String> deleteReview(Authentication a, @PathVariable UUID id) {
        Review r = reviews.findById(id).orElseThrow(() -> CurrentUser.notFound("Avis"));
        reviews.delete(r);
        ratings.refresh(r.getTeacherId());
        log(a, "REVIEW_DELETE", "REVIEW", id, r.getRating() + "★ " + (r.getComment() == null ? "" : r.getComment()));
        return Map.of("status", "deleted");
    }

    // ---------------------------------------------------------------- audit trail

    @GetMapping("/audit-logs")
    public PageResponse<AuditLog> auditLogs(@RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        Page<AuditLog> p = audit.findAllByOrderByCreatedAtDesc(page(page, size, Sort.unsorted()));
        Map<UUID, String> n = names.of(p.getContent().stream().map(AuditLog::getAdminId).toList());
        p.getContent().forEach(l -> l.setAdminName(n.getOrDefault(l.getAdminId(), "Administrateur")));
        return PageResponse.of(p);
    }
}
