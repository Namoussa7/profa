package com.profa.job;

import com.profa.billing.BillingService;
import com.profa.notification.NotificationService;
import com.profa.school.SchoolProfile;
import com.profa.school.SchoolRepository;
import com.profa.security.CurrentUser;
import com.profa.teacher.TeacherProfile;
import com.profa.teacher.TeacherRepository;
import com.profa.user.UserNames;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {

    static final Set<String> APPLICATION_STATUSES = Set.of("NEW", "REVIEWING", "SHORTLISTED", "INTERVIEW", "HIRED", "REJECTED");

    final JobRepository jobs;
    final ApplicationRepository apps;
    final SchoolRepository schools;
    final TeacherRepository teachers;
    final NotificationService notifications;
    final UserNames names;
    final BillingService billing;

    public JobController(JobRepository j, ApplicationRepository a, SchoolRepository s, TeacherRepository t,
                         NotificationService n, UserNames names, BillingService billing) {
        jobs = j; apps = a; schools = s; teachers = t; notifications = n; this.names = names; this.billing = billing;
    }

    private JobOffer withSchool(JobOffer j) {
        j.setSchoolName(schools.findByUserId(j.getSchoolId()).map(SchoolProfile::getName)
                .filter(n -> !n.isBlank()).orElse(names.of(j.getSchoolId())));
        return j;
    }

    private static String like(String v) {
        return v == null || v.isBlank() ? "" : "%" + v.trim().toLowerCase(Locale.ROOT) + "%";
    }

    private static boolean matches(String value, String filter) {
        return filter == null || filter.isBlank()
                || (value != null && value.toLowerCase(Locale.ROOT).contains(filter.trim().toLowerCase(Locale.ROOT)));
    }

    /** Open offers with optional filters. B2B only: parents and visitors cannot see school offers. */
    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER','SCHOOL','ADMIN')")
    public List<JobOffer> list(@RequestParam(required = false) String q,
                               @RequestParam(required = false) String city,
                               @RequestParam(required = false) String subject,
                               @RequestParam(required = false) String contractType) {
        Set<UUID> featured = billing.featuredSchools();
        return jobs.searchOpen(like(q), like(city), like(subject), like(contractType),
                        org.springframework.data.domain.PageRequest.of(0, 100)).stream()
                .map(this::withSchool)
                .peek(j -> j.setFeatured(featured.contains(j.getSchoolId())))
                // Premium schools first, then most recent (list already ordered by date).
                .sorted(Comparator.comparing((JobOffer j) -> Boolean.TRUE.equals(j.getFeatured())).reversed())
                .toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','SCHOOL','ADMIN')")
    public JobOffer one(@PathVariable UUID id) {
        return withSchool(jobs.findById(id).orElseThrow(() -> CurrentUser.notFound("Offre")));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('SCHOOL')")
    public List<JobOffer> mine(Authentication a) {
        List<JobOffer> list = jobs.findBySchoolIdOrderByCreatedAtDesc(CurrentUser.id(a));
        list.forEach(j -> j.setApplicationsCount(apps.countByJobId(j.getId())));
        return list;
    }

    @PostMapping
    @PreAuthorize("hasRole('SCHOOL')")
    public JobOffer create(Authentication a, @RequestBody JobOffer in) {
        if (in.getTitle() == null || in.getTitle().isBlank()) throw CurrentUser.badRequest("Titre requis");
        billing.checkCanOpenOffer(CurrentUser.id(a));
        if (in.getSalaryMin() != null && in.getSalaryMax() != null && in.getSalaryMin() > in.getSalaryMax())
            throw CurrentUser.badRequest("Le salaire minimum dépasse le maximum");
        JobOffer x = new JobOffer();
        x.setSchoolId(CurrentUser.id(a));
        x.setTitle(in.getTitle().trim());
        x.setSubject(in.getSubject());
        x.setLevel(in.getLevel());
        x.setCity(in.getCity());
        x.setContractType(in.getContractType());
        x.setSalaryMin(in.getSalaryMin());
        x.setSalaryMax(in.getSalaryMax());
        x.setDescription(in.getDescription());
        return jobs.save(x);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SCHOOL','ADMIN')")
    public JobOffer status(Authentication a, @PathVariable UUID id, @RequestParam String value) {
        JobOffer j = jobs.findById(id).orElseThrow(() -> CurrentUser.notFound("Offre"));
        if (!CurrentUser.isAdmin(a) && !CurrentUser.id(a).equals(j.getSchoolId())) throw CurrentUser.forbidden();
        String next = value.toUpperCase(Locale.ROOT);
        if (!Set.of("OPEN", "CLOSED").contains(next)) throw CurrentUser.badRequest("Statut invalide");
        if ("OPEN".equals(next) && !"OPEN".equals(j.getStatus()) && !CurrentUser.isAdmin(a)) billing.checkCanOpenOffer(j.getSchoolId());
        j.setStatus(next);
        return jobs.save(j);
    }

    @PostMapping("/{id}/apply")
    @PreAuthorize("hasRole('TEACHER')")
    public Application apply(Authentication a, @PathVariable UUID id, @RequestBody(required = false) Application in) {
        UUID me = CurrentUser.id(a);
        JobOffer j = jobs.findById(id).orElseThrow(() -> CurrentUser.notFound("Offre"));
        if (!"OPEN".equals(j.getStatus())) throw CurrentUser.badRequest("Cette offre n'est plus ouverte");
        if (teachers.findByUserId(me).map(TeacherProfile::isSuspended).orElse(false))
            throw CurrentUser.badRequest("Votre profil est suspendu : contactez l'équipe Profa");
        if (!teachers.findByUserId(me).map(TeacherProfile::isDocumentsComplete).orElse(false))
            throw CurrentUser.badRequest("Envoyez d'abord votre CV et votre diplôme en PDF depuis votre espace pour postuler");
        if (apps.existsByJobIdAndTeacherId(id, me))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous avez déjà postulé à cette offre");
        Application x = new Application();
        x.setJobId(id);
        x.setTeacherId(me);
        x.setCoverLetter(in == null ? null : in.getCoverLetter());
        Application saved = apps.save(x);
        notifications.notify(j.getSchoolId(), "APPLICATION", "Nouvelle candidature",
                names.of(me) + " a postulé à « " + j.getTitle() + " »", "/dashboard");
        return saved;
    }

    @GetMapping("/applications/mine")
    @PreAuthorize("hasRole('TEACHER')")
    public List<Application> myApplications(Authentication a) {
        List<Application> list = apps.findByTeacherId(CurrentUser.id(a));
        list.forEach(x -> x.setJobTitle(jobs.findById(x.getJobId()).map(JobOffer::getTitle).orElse("Offre supprimée")));
        return list;
    }

    @GetMapping("/{id}/applications")
    @PreAuthorize("hasAnyRole('SCHOOL','ADMIN')")
    public List<Application> applications(Authentication a, @PathVariable UUID id) {
        JobOffer j = jobs.findById(id).orElseThrow(() -> CurrentUser.notFound("Offre"));
        if (!CurrentUser.isAdmin(a) && !CurrentUser.id(a).equals(j.getSchoolId())) throw CurrentUser.forbidden();
        List<Application> list = apps.findByJobId(id);
        Map<UUID, String> n = names.of(list.stream().map(Application::getTeacherId).toList());
        list.forEach(x -> {
            x.setJobTitle(j.getTitle());
            x.setTeacherName(n.getOrDefault(x.getTeacherId(), "Enseignant"));
            x.setTeacherProfileId(teachers.findByUserId(x.getTeacherId()).map(TeacherProfile::getId).orElse(null));
        });
        return list;
    }

    @PatchMapping("/applications/{id}")
    @PreAuthorize("hasAnyRole('SCHOOL','ADMIN')")
    public Application update(Authentication a, @PathVariable UUID id, @RequestParam String status) {
        Application x = apps.findById(id).orElseThrow(() -> CurrentUser.notFound("Candidature"));
        JobOffer j = jobs.findById(x.getJobId()).orElseThrow(() -> CurrentUser.notFound("Offre"));
        if (!CurrentUser.isAdmin(a) && !CurrentUser.id(a).equals(j.getSchoolId())) throw CurrentUser.forbidden();
        String next = status.toUpperCase(Locale.ROOT);
        if (!APPLICATION_STATUSES.contains(next)) throw CurrentUser.badRequest("Statut invalide");
        x.setStatus(next);
        Application saved = apps.save(x);
        notifications.notify(x.getTeacherId(), "APPLICATION", "Candidature mise à jour",
                "Votre candidature à « " + j.getTitle() + " » est maintenant : " + next, "/dashboard");
        return saved;
    }
}
