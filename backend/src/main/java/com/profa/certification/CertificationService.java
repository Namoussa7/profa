package com.profa.certification;

import com.profa.billing.BillingService;
import com.profa.billing.PlatformSettings;
import com.profa.document.TeacherDocument;
import com.profa.document.TeacherDocumentRepository;
import com.profa.notification.NotificationService;
import com.profa.security.CurrentUser;
import com.profa.teacher.TeacherProfile;
import com.profa.teacher.TeacherRepository;
import com.profa.user.Role;
import com.profa.user.UserNames;
import com.profa.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Teacher vetting: knowledge test per subject/level, video review, criminal record for home lessons,
 * automatic suspension on poor ratings, and reports from parents/schools.
 */
@Service
public class CertificationService {

    public static final Set<String> REPORT_REASONS = Set.of("ABSENCE", "BEHAVIOR", "SAFETY", "LEVEL", "FRAUD", "OTHER");
    private static final Duration GRACE = Duration.ofSeconds(30);
    private static final Random RANDOM = new Random();

    public record QuestionView(UUID id, String text, List<String> choices) {}
    public record AttemptView(UUID id, String subject, String level, Instant expiresAt, int durationMinutes, List<QuestionView> questions) {}
    public record Result(int score, boolean passed, int passScore, int correct, int total, boolean late, Instant retryAt) {}
    public record CatalogItem(String subject, String level, long questions, boolean passed, Integer score, int failedRecently,
                              int maxAttempts, Instant retryAt, UUID openAttemptId) {}

    private final QuizQuestionRepository questions;
    private final QuizAttemptRepository attempts;
    private final TeacherCertificationRepository certifications;
    private final TeacherReportRepository reports;
    private final TeacherRepository teachers;
    private final TeacherDocumentRepository documents;
    private final UserRepository users;
    private final BillingService billing;
    private final NotificationService notifications;
    private final UserNames names;

    public CertificationService(QuizQuestionRepository questions, QuizAttemptRepository attempts,
                                TeacherCertificationRepository certifications, TeacherReportRepository reports,
                                TeacherRepository teachers, TeacherDocumentRepository documents, UserRepository users,
                                BillingService billing, NotificationService notifications, UserNames names) {
        this.questions = questions; this.attempts = attempts; this.certifications = certifications; this.reports = reports;
        this.teachers = teachers; this.documents = documents; this.users = users; this.billing = billing;
        this.notifications = notifications; this.names = names;
    }

    private PlatformSettings settings() {
        return billing.settings();
    }

    private void notifyAdmins(String title, String body) {
        users.findByRole(Role.ADMIN).forEach(a -> notifications.notify(a.getId(), "CERTIFICATION", title, body, "/admin"));
    }

    // ------------------------------------------------------------------ knowledge test

    /** Earliest moment a new attempt is allowed, or null when the teacher may try now. */
    private Instant retryAt(UUID teacherId, String subject, String level, PlatformSettings s) {
        Instant windowStart = Instant.now().minus(Duration.ofDays(s.getQuizCooldownDays()));
        List<QuizAttempt> failed = attempts.findByTeacherIdAndSubjectAndLevelOrderByStartedAtDesc(teacherId, subject, level).stream()
                .filter(a -> Boolean.FALSE.equals(a.getPassed()) && a.getStartedAt().isAfter(windowStart)).toList();
        if (failed.size() < s.getQuizMaxAttempts()) return null;
        return failed.get(0).getStartedAt().plus(Duration.ofDays(s.getQuizCooldownDays()));
    }

    public List<CatalogItem> catalog(UUID teacherId) {
        PlatformSettings s = settings();
        Map<String, TeacherCertification> passed = certifications.findByTeacherIdOrderBySubjectAsc(teacherId).stream()
                .collect(Collectors.toMap(c -> c.getSubject() + "|" + c.getLevel(), c -> c, (a, b) -> a));
        List<QuizAttempt> mine = attempts.findByTeacherIdOrderByStartedAtDesc(teacherId);
        Instant windowStart = Instant.now().minus(Duration.ofDays(s.getQuizCooldownDays()));
        List<CatalogItem> out = new ArrayList<>();
        for (Object[] row : questions.bankSizes()) {
            String subject = (String) row[0], level = (String) row[1];
            long count = ((Number) row[2]).longValue();
            if (count < s.getQuizQuestionCount()) continue; // not enough questions yet for a fair random draw
            TeacherCertification c = passed.get(subject + "|" + level);
            int failed = (int) mine.stream().filter(a -> subject.equals(a.getSubject()) && level.equals(a.getLevel())
                    && Boolean.FALSE.equals(a.getPassed()) && a.getStartedAt().isAfter(windowStart)).count();
            UUID open = mine.stream().filter(a -> subject.equals(a.getSubject()) && level.equals(a.getLevel())
                    && a.getSubmittedAt() == null && a.getExpiresAt().plus(GRACE).isAfter(Instant.now()))
                    .map(QuizAttempt::getId).findFirst().orElse(null);
            out.add(new CatalogItem(subject, level, count, c != null, c == null ? null : c.getScore(), failed,
                    s.getQuizMaxAttempts(), c == null ? retryAt(teacherId, subject, level, s) : null, open));
        }
        return out;
    }

    private AttemptView view(QuizAttempt a, PlatformSettings s) {
        Map<UUID, QuizQuestion> byId = questions.findAllById(ids(a)).stream().collect(Collectors.toMap(QuizQuestion::getId, q -> q));
        List<QuestionView> qs = ids(a).stream().map(byId::get).filter(Objects::nonNull)
                .map(q -> new QuestionView(q.getId(), q.getText(), q.getChoiceList())).toList();
        return new AttemptView(a.getId(), a.getSubject(), a.getLevel(), a.getExpiresAt(), s.getQuizDurationMinutes(), qs);
    }

    private static List<UUID> ids(QuizAttempt a) {
        return Arrays.stream(a.getQuestionIds().split(",")).map(UUID::fromString).toList();
    }

    /** Starts (or resumes) a timed test with questions drawn at random; correct answers are never sent. */
    @Transactional
    public AttemptView start(UUID teacherId, String subject, String level) {
        if (subject == null || level == null) throw CurrentUser.badRequest("Matière et niveau requis");
        PlatformSettings s = settings();
        if (certifications.findByTeacherIdAndSubjectAndLevel(teacherId, subject, level).isPresent())
            throw CurrentUser.badRequest("Vous êtes déjà certifié pour cette matière et ce niveau");
        Optional<QuizAttempt> open = attempts.findByTeacherIdAndSubjectAndLevelOrderByStartedAtDesc(teacherId, subject, level).stream()
                .filter(a -> a.getSubmittedAt() == null && a.getExpiresAt().plus(GRACE).isAfter(Instant.now())).findFirst();
        if (open.isPresent()) return view(open.get(), s);
        Instant retry = retryAt(teacherId, subject, level, s);
        if (retry != null) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Nombre maximal de tentatives atteint. Nouvel essai possible le " + retry.toString().substring(0, 10) + ".");
        List<QuizQuestion> bank = new ArrayList<>(questions.findBySubjectAndLevelAndActiveTrue(subject, level));
        if (bank.size() < s.getQuizQuestionCount()) throw CurrentUser.badRequest("Ce test n'est pas encore disponible");
        Collections.shuffle(bank, RANDOM);
        QuizAttempt a = new QuizAttempt();
        a.setTeacherId(teacherId);
        a.setSubject(subject);
        a.setLevel(level);
        a.setQuestionIds(bank.subList(0, s.getQuizQuestionCount()).stream().map(q -> q.getId().toString()).collect(Collectors.joining(",")));
        a.setExpiresAt(Instant.now().plus(Duration.ofMinutes(s.getQuizDurationMinutes())));
        return view(attempts.save(a), s);
    }

    @Transactional
    public Result submit(UUID teacherId, UUID attemptId, Map<String, Integer> answers) {
        PlatformSettings s = settings();
        QuizAttempt a = attempts.findById(attemptId).orElseThrow(() -> CurrentUser.notFound("Test"));
        if (!teacherId.equals(a.getTeacherId())) throw CurrentUser.forbidden();
        if (a.getSubmittedAt() != null) throw CurrentUser.badRequest("Ce test a déjà été envoyé");
        boolean late = Instant.now().isAfter(a.getExpiresAt().plus(GRACE));
        List<UUID> ids = ids(a);
        Map<UUID, QuizQuestion> byId = questions.findAllById(ids).stream().collect(Collectors.toMap(QuizQuestion::getId, q -> q));
        Map<String, Integer> given = answers == null ? Map.of() : answers;
        int correct = late ? 0 : (int) ids.stream().filter(id -> {
            QuizQuestion q = byId.get(id);
            Integer ans = given.get(id.toString());
            return q != null && ans != null && ans == q.getCorrectIndex();
        }).count();
        int score = ids.isEmpty() ? 0 : Math.round(correct * 100f / ids.size());
        boolean passed = !late && score >= s.getQuizPassScore();
        a.setSubmittedAt(Instant.now());
        a.setScore(score);
        a.setPassed(passed);
        attempts.save(a);
        if (passed) {
            TeacherCertification c = new TeacherCertification();
            c.setTeacherId(teacherId);
            c.setSubject(a.getSubject());
            c.setLevel(a.getLevel());
            c.setScore(score);
            certifications.save(c);
            teachers.findByUserId(teacherId).ifPresent(p -> {
                p.setSubjects(addToCsv(p.getSubjects(), a.getSubject()));
                p.setLevels(addToCsv(p.getLevels(), a.getLevel()));
                teachers.save(p);
            });
            refresh(teacherId);
            notifications.notify(teacherId, "CERTIFICATION", "Test réussi",
                    a.getSubject() + " · " + a.getLevel() + " : " + score + " %. Matière certifiée sur votre profil.", "/dashboard");
        }
        return new Result(score, passed, s.getQuizPassScore(), correct, ids.size(), late,
                passed ? null : retryAt(teacherId, a.getSubject(), a.getLevel(), s));
    }

    private static String addToCsv(String csv, String value) {
        List<String> l = new ArrayList<>(csv == null || csv.isBlank() ? List.of() : Arrays.stream(csv.split(",")).map(String::trim).toList());
        if (!l.contains(value)) l.add(value);
        return String.join(",", l);
    }

    // ------------------------------------------------------------------ badges

    /** Recomputes « Certifié Profa » and « Domicile sécurisé » from documents, tests and video. */
    @Transactional
    public void refresh(UUID teacherId) {
        TeacherProfile p = teachers.findByUserId(teacherId).orElse(null);
        if (p == null) return;
        boolean homeSafe = documents.findByTeacherId(teacherId).stream().anyMatch(d -> "CRIMINAL_RECORD".equals(d.getType())
                && "APPROVED".equals(d.getStatus()) && d.isHasFile());
        int count = (int) certifications.countByTeacherId(teacherId);
        boolean certified = p.isVerified() && p.isDocumentsComplete() && count > 0 && "APPROVED".equals(p.getVideoStatus());
        boolean becameCertified = certified && !p.isCertified();
        p.setHomeSafe(homeSafe);
        p.setCertificationCount(count);
        p.setCertified(certified);
        teachers.save(p);
        if (becameCertified) notifications.notify(teacherId, "CERTIFICATION", "Vous êtes « Certifié Profa »",
                "Documents, test et vidéo validés : votre profil affiche désormais le badge Certifié Profa.", "/enseignants/" + p.getId());
    }

    /** Teacher changed the video link: it goes back to review. */
    public void videoChanged(TeacherProfile p, String newUrl) {
        String old = p.getIntroVideoUrl() == null ? "" : p.getIntroVideoUrl().trim();
        String now = newUrl == null ? "" : newUrl.trim();
        if (old.equals(now)) return;
        p.setVideoStatus(now.isEmpty() ? "NONE" : "PENDING");
        p.setVideoRejectionReason(null);
        p.setCertified(false);
        if (!now.isEmpty()) notifyAdmins("Vidéo à valider", names.of(p.getUserId()) + " a envoyé une vidéo de présentation.");
    }

    @Transactional
    public TeacherProfile reviewVideo(UUID profileId, String status, String reason) {
        TeacherProfile p = teachers.findById(profileId).orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        String next = status == null ? "" : status.toUpperCase(Locale.ROOT);
        if (!Set.of("APPROVED", "REJECTED").contains(next)) throw CurrentUser.badRequest("Statut invalide");
        if ("REJECTED".equals(next) && (reason == null || reason.isBlank())) throw CurrentUser.badRequest("Indiquez le motif du refus");
        p.setVideoStatus(next);
        p.setVideoRejectionReason("REJECTED".equals(next) ? reason.trim() : null);
        teachers.save(p);
        refresh(p.getUserId());
        notifications.notify(p.getUserId(), "CERTIFICATION", "APPROVED".equals(next) ? "Vidéo validée" : "Vidéo refusée",
                "APPROVED".equals(next) ? "Votre vidéo de présentation a été validée." : "Motif : " + reason + ". Envoyez une nouvelle vidéo depuis votre profil.",
                "/profil");
        return p;
    }

    // ------------------------------------------------------------------ quality control

    /** Called after each rating change: suspends the teacher below the configured threshold. */
    @Transactional
    public void checkRating(UUID teacherId) {
        PlatformSettings s = settings();
        TeacherProfile p = teachers.findByUserId(teacherId).orElse(null);
        if (p == null || p.isSuspended()) return;
        if (p.getReviewCount() >= s.getSuspendMinReviews() && p.getRatingAvg() < s.getSuspendThreshold()) {
            suspend(p, "Note moyenne " + String.format(Locale.FRANCE, "%.1f", p.getRatingAvg()) + "/5 sur " + p.getReviewCount()
                    + " avis (seuil " + s.getSuspendThreshold() + ")");
        }
    }

    @Transactional
    public TeacherProfile suspend(TeacherProfile p, String reason) {
        p.setSuspended(true);
        p.setSuspendedReason(reason);
        teachers.save(p);
        notifications.notify(p.getUserId(), "CERTIFICATION", "Profil suspendu",
                "Votre profil n'est plus visible : " + reason + ". Contactez l'équipe Profa.", "/dashboard");
        notifyAdmins("Enseignant suspendu", names.of(p.getUserId()) + " — " + reason);
        return p;
    }

    @Transactional
    public TeacherProfile setSuspended(UUID profileId, boolean suspended, String reason) {
        TeacherProfile p = teachers.findById(profileId).orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        if (suspended) return suspend(p, reason == null || reason.isBlank() ? "Décision de l'équipe Profa" : reason.trim());
        p.setSuspended(false);
        p.setSuspendedReason(null);
        teachers.save(p);
        notifications.notify(p.getUserId(), "CERTIFICATION", "Profil réactivé", "Votre profil est de nouveau visible.", "/dashboard");
        return p;
    }

    @Transactional
    public TeacherReport report(UUID reporterId, UUID teacherUserId, String reason, String details) {
        String r = reason == null ? "" : reason.toUpperCase(Locale.ROOT);
        if (!REPORT_REASONS.contains(r)) throw CurrentUser.badRequest("Motif invalide");
        if (teacherUserId == null || teachers.findByUserId(teacherUserId).isEmpty()) throw CurrentUser.notFound("Enseignant");
        if (teacherUserId.equals(reporterId)) throw CurrentUser.badRequest("Signalement impossible");
        if (reports.existsByReporterIdAndTeacherIdAndStatus(reporterId, teacherUserId, "OPEN"))
            throw CurrentUser.badRequest("Vous avez déjà un signalement en cours pour cet enseignant");
        TeacherReport t = new TeacherReport();
        t.setReporterId(reporterId);
        t.setTeacherId(teacherUserId);
        t.setReason(r);
        t.setDetails(details == null ? null : details.trim());
        TeacherReport saved = reports.save(t);
        notifyAdmins("SAFETY".equals(r) ? "Signalement URGENT (sécurité)" : "Nouveau signalement",
                names.of(teacherUserId) + " — " + r);
        return saved;
    }

    @Transactional
    public TeacherReport resolve(UUID reportId, String resolution, boolean suspendTeacher) {
        TeacherReport t = reports.findById(reportId).orElseThrow(() -> CurrentUser.notFound("Signalement"));
        t.setStatus("RESOLVED");
        t.setResolution(resolution == null || resolution.isBlank() ? null : resolution.trim());
        reports.save(t);
        if (suspendTeacher) teachers.findByUserId(t.getTeacherId())
                .ifPresent(p -> suspend(p, "Signalement : " + (t.getResolution() == null ? t.getReason() : t.getResolution())));
        notifications.notify(t.getReporterId(), "CERTIFICATION", "Signalement traité",
                "Merci : votre signalement a été examiné par l'équipe Profa.", "/dashboard");
        return t;
    }

    /** Settings shared with billing; only the certification fields are changed here. */
    @Transactional
    public PlatformSettings updateSettings(PlatformSettings in) {
        if (in.getQuizQuestionCount() < 5 || in.getQuizQuestionCount() > 100) throw CurrentUser.badRequest("Nombre de questions : entre 5 et 100");
        if (in.getQuizDurationMinutes() < 5 || in.getQuizDurationMinutes() > 180) throw CurrentUser.badRequest("Durée : entre 5 et 180 minutes");
        if (in.getQuizPassScore() < 1 || in.getQuizPassScore() > 100) throw CurrentUser.badRequest("Note minimale : entre 1 et 100 %");
        if (in.getQuizMaxAttempts() < 1 || in.getQuizCooldownDays() < 0) throw CurrentUser.badRequest("Tentatives et délai invalides");
        if (in.getSuspendThreshold() < 0 || in.getSuspendThreshold() > 5 || in.getSuspendMinReviews() < 1)
            throw CurrentUser.badRequest("Seuil de suspension invalide");
        PlatformSettings s = settings();
        s.setQuizQuestionCount(in.getQuizQuestionCount());
        s.setQuizDurationMinutes(in.getQuizDurationMinutes());
        s.setQuizPassScore(in.getQuizPassScore());
        s.setQuizMaxAttempts(in.getQuizMaxAttempts());
        s.setQuizCooldownDays(in.getQuizCooldownDays());
        s.setRequireCertification(in.isRequireCertification());
        s.setRequireRecordForHome(in.isRequireRecordForHome());
        s.setSuspendThreshold(in.getSuspendThreshold());
        s.setSuspendMinReviews(in.getSuspendMinReviews());
        s.setUpdatedAt(Instant.now());
        return billing.saveSettings(s);
    }

    public List<TeacherDocument> criminalRecords(UUID teacherId) {
        return documents.findByTeacherId(teacherId).stream().filter(d -> "CRIMINAL_RECORD".equals(d.getType())).toList();
    }
}
