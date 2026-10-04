package com.profa.admin;

import com.profa.user.*;
import com.profa.teacher.*;
import com.profa.school.*;
import com.profa.document.*;
import com.profa.job.*;
import com.profa.booking.*;
import com.profa.payment.*;
import com.profa.review.*;
import com.profa.course.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    final UserRepository users;
    final TeacherRepository teachers;
    final SchoolRepository schools;
    final TeacherDocumentRepository docs;
    final JobRepository jobs;
    final ApplicationRepository applications;
    final BookingRepository bookings;
    final PaymentRepository payments;
    final ReviewRepository reviews;
    final CourseRequestRepository courseRequests;

    public AdminController(
            UserRepository users,
            TeacherRepository teachers,
            SchoolRepository schools,
            TeacherDocumentRepository docs,
            JobRepository jobs,
            ApplicationRepository applications,
            BookingRepository bookings,
            PaymentRepository payments,
            ReviewRepository reviews,
            CourseRequestRepository courseRequests) {
        this.users = users;
        this.teachers = teachers;
        this.schools = schools;
        this.docs = docs;
        this.jobs = jobs;
        this.applications = applications;
        this.bookings = bookings;
        this.payments = payments;
        this.reviews = reviews;
        this.courseRequests = courseRequests;
    }

    @GetMapping("/stats")
    public Map<String,Object> stats() {
        long pendingDocuments = docs.findAll().stream()
                .filter(x -> "PENDING".equalsIgnoreCase(x.getStatus())).count();

        long pendingTeachers = teachers.findAll().stream()
                .filter(x -> !x.isVerified()).count();

        long activeUsers = users.findAll().stream()
                .filter(User::isEnabled).count();

        long openJobs = jobs.findAll().stream()
                .filter(x -> "OPEN".equalsIgnoreCase(x.getStatus())).count();

        long pendingBookings = bookings.findAll().stream()
                .filter(x -> "PENDING_PAYMENT".equalsIgnoreCase(x.getStatus())
                        || "PENDING_PAYMENT".equalsIgnoreCase(x.getPaymentStatus())).count();

        long pendingPayments = payments.findAll().stream()
                .filter(x -> "PENDING".equalsIgnoreCase(x.getStatus())).count();

        long courseRequestsPending = courseRequests.findAll().stream()
                .filter(x -> "PENDING".equalsIgnoreCase(x.getStatus())).count();

        Map<String,Object> result = new LinkedHashMap<>();
        result.put("users", users.count());
        result.put("activeUsers", activeUsers);
        result.put("teachers", teachers.count());
        result.put("schools", schools.count());
        result.put("pendingTeachers", pendingTeachers);
        result.put("pendingDocuments", pendingDocuments);
        result.put("jobs", jobs.count());
        result.put("openJobs", openJobs);
        result.put("applications", applications.count());
        result.put("courseRequests", courseRequests.count());
        result.put("courseRequestsPending", courseRequestsPending);
        result.put("bookings", bookings.count());
        result.put("pendingBookings", pendingBookings);
        result.put("payments", payments.count());
        result.put("pendingPayments", pendingPayments);
        result.put("reviews", reviews.count());
        return result;
    }

    @GetMapping("/users")
    public List<User> users() {
        return users.findAll();
    }

    @PatchMapping("/users/{id}/enabled")
    public User setUserEnabled(@PathVariable UUID id, @RequestParam boolean enabled) {
        User user = users.findById(id).orElseThrow();
        user.setEnabled(enabled);
        return users.save(user);
    }

    @PatchMapping("/users/{id}/verified")
    public User setUserVerified(@PathVariable UUID id, @RequestParam boolean verified) {
        User user = users.findById(id).orElseThrow();
        user.setVerified(verified);
        return users.save(user);
    }

    @GetMapping("/teachers/pending")
    public List<TeacherProfile> pending() {
        return teachers.findAll().stream()
                .filter(x -> !x.isVerified())
                .toList();
    }

    @GetMapping("/teachers")
    public List<TeacherProfile> allTeachers() {
        return teachers.findAll();
    }

    @PatchMapping("/teachers/{id}/verify")
    public TeacherProfile verify(@PathVariable UUID id) {
        TeacherProfile p = teachers.findById(id).orElseThrow();
        p.setVerified(true);
        return teachers.save(p);
    }

    @GetMapping("/documents")
    public List<TeacherDocument> documents() {
        return docs.findAll();
    }

    @PatchMapping("/documents/{id}")
    public TeacherDocument document(@PathVariable UUID id, @RequestParam String status) {
        TeacherDocument d = docs.findById(id).orElseThrow();
        d.setStatus(status.toUpperCase(Locale.ROOT));
        return docs.save(d);
    }

    @GetMapping("/schools")
    public List<SchoolProfile> allSchools() {
        return schools.findAll();
    }

    @GetMapping("/jobs")
    public List<JobOffer> allJobs() {
        return jobs.findAll();
    }

    @PatchMapping("/jobs/{id}/status")
    public JobOffer setJobStatus(@PathVariable UUID id, @RequestParam String status) {
        JobOffer job = jobs.findById(id).orElseThrow();
        job.setStatus(status.toUpperCase(Locale.ROOT));
        return jobs.save(job);
    }

    @GetMapping("/applications")
    public List<Application> allApplications() {
        return applications.findAll();
    }

    @PatchMapping("/applications/{id}/status")
    public Application setApplicationStatus(@PathVariable UUID id, @RequestParam String status) {
        Application application = applications.findById(id).orElseThrow();
        application.setStatus(status.toUpperCase(Locale.ROOT));
        return applications.save(application);
    }

    @GetMapping("/course-requests")
    public List<CourseRequest> allCourseRequests() {
        return courseRequests.findAll();
    }

    @GetMapping("/bookings")
    public List<Booking> allBookings() {
        return bookings.findAll();
    }

    @PatchMapping("/bookings/{id}/status")
    public Booking setBookingStatus(@PathVariable UUID id, @RequestParam String status) {
        Booking booking = bookings.findById(id).orElseThrow();
        booking.setStatus(status.toUpperCase(Locale.ROOT));
        return bookings.save(booking);
    }

    @GetMapping("/payments")
    public List<Payment> allPayments() {
        return payments.findAll();
    }

    @PatchMapping("/payments/{id}/status")
    public Payment setPaymentStatus(@PathVariable UUID id, @RequestParam String status) {
        Payment payment = payments.findById(id).orElseThrow();
        payment.setStatus(status.toUpperCase(Locale.ROOT));
        return payments.save(payment);
    }

    @GetMapping("/reviews")
    public List<Review> allReviews() {
        return reviews.findAll();
    }
}