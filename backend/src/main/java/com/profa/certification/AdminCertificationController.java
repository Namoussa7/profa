package com.profa.certification;

import com.profa.admin.AuditLog;
import com.profa.admin.AuditLogRepository;
import com.profa.billing.BillingService;
import com.profa.billing.PlatformSettings;
import com.profa.common.PageResponse;
import com.profa.security.CurrentUser;
import com.profa.teacher.TeacherProfile;
import com.profa.teacher.TeacherRepository;
import com.profa.user.UserNames;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/admin/certification")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCertificationController {

    final CertificationService service;
    final QuizQuestionRepository questions;
    final QuizAttemptRepository attempts;
    final TeacherReportRepository reports;
    final TeacherRepository teachers;
    final BillingService billing;
    final AuditLogRepository audit;
    final UserNames names;

    public AdminCertificationController(CertificationService service, QuizQuestionRepository questions, QuizAttemptRepository attempts,
                                        TeacherReportRepository reports, TeacherRepository teachers, BillingService billing,
                                        AuditLogRepository audit, UserNames names) {
        this.service = service; this.questions = questions; this.attempts = attempts; this.reports = reports;
        this.teachers = teachers; this.billing = billing; this.audit = audit; this.names = names;
    }

    public record Bank(String subject, String level, long questions, boolean ready) {}
    public record Overview(List<Bank> bank, long attempts, long passed, long pendingVideos, long openReports, long suspended, long certified) {}
    public record QuestionIn(String subject, String level, String text, List<String> choices, Integer correctIndex) {}
    public record ImportIn(String csv) {}
    public record ImportResult(int imported, List<String> errors) {}
    public record TeacherRow(UUID id, UUID userId, String name, String headline, String videoUrl, String videoStatus,
                             boolean suspended, String suspendedReason, double ratingAvg, int reviewCount) {}
    public record Resolve(String resolution, boolean suspend) {}

    private void log(Authentication a, String action, UUID target, String details) {
        AuditLog l = new AuditLog();
        l.setAdminId(CurrentUser.id(a));
        l.setAction(action);
        l.setTargetType("CERTIFICATION");
        l.setTargetId(target);
        l.setDetails(details);
        audit.save(l);
    }

    private TeacherRow row(TeacherProfile p) {
        return new TeacherRow(p.getId(), p.getUserId(), names.of(p.getUserId()), p.getHeadline(), p.getIntroVideoUrl(),
                p.getVideoStatus(), p.isSuspended(), p.getSuspendedReason(), p.getRatingAvg(), p.getReviewCount());
    }

    @GetMapping("/settings")
    public PlatformSettings settings() {
        return billing.settings();
    }

    @PutMapping("/settings")
    public PlatformSettings update(Authentication a, @RequestBody PlatformSettings in) {
        PlatformSettings s = service.updateSettings(in);
        log(a, "CERTIFICATION_SETTINGS", null, s.getQuizQuestionCount() + " questions · " + s.getQuizDurationMinutes() + " min · "
                + s.getQuizPassScore() + " % · test " + (s.isRequireCertification() ? "obligatoire" : "facultatif")
                + " · casier domicile " + (s.isRequireRecordForHome() ? "obligatoire" : "facultatif"));
        return s;
    }

    @GetMapping("/overview")
    public Overview overview() {
        int needed = billing.settings().getQuizQuestionCount();
        List<Bank> bank = questions.bankSizes().stream().map(r -> {
            long n = ((Number) r[2]).longValue();
            return new Bank((String) r[0], (String) r[1], n, n >= needed);
        }).toList();
        return new Overview(bank, attempts.countBySubmittedAtIsNotNull(), attempts.countByPassedTrue(),
                teachers.countByVideoStatus("PENDING"), reports.countByStatus("OPEN"), teachers.countBySuspendedTrue(),
                teachers.countByCertifiedTrue());
    }

    // ---------------------------------------------------------------- question bank

    @GetMapping("/questions")
    public PageResponse<QuizQuestion> questions(@RequestParam(required = false) String subject, @RequestParam(required = false) String level,
                                                @RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        return PageResponse.of(questions.search(subject == null ? "" : subject.trim(), level == null ? "" : level.trim(),
                PageRequest.of(Math.max(page, 0), PageResponse.size(size, 20))));
    }

    private static QuizQuestion validate(QuizQuestion q, QuestionIn in) {
        if (in.subject() == null || in.subject().isBlank() || in.level() == null || in.level().isBlank())
            throw CurrentUser.badRequest("Matière et niveau requis");
        if (in.text() == null || in.text().isBlank()) throw CurrentUser.badRequest("Énoncé requis");
        List<String> choices = in.choices() == null ? List.of() : in.choices().stream().map(c -> c == null ? "" : c.trim().replace("\n", " "))
                .filter(c -> !c.isEmpty()).toList();
        if (choices.size() < 2 || choices.size() > 6) throw CurrentUser.badRequest("Entre 2 et 6 réponses");
        if (in.correctIndex() == null || in.correctIndex() < 0 || in.correctIndex() >= choices.size())
            throw CurrentUser.badRequest("Indiquez la bonne réponse");
        q.setSubject(in.subject().trim());
        q.setLevel(in.level().trim());
        q.setText(in.text().trim());
        q.setChoiceList(choices);
        q.setCorrectIndex(in.correctIndex());
        return q;
    }

    @PostMapping("/questions")
    public QuizQuestion create(@RequestBody QuestionIn in) {
        return questions.save(validate(new QuizQuestion(), in));
    }

    @PutMapping("/questions/{id}")
    public QuizQuestion update(@PathVariable UUID id, @RequestBody QuestionIn in) {
        return questions.save(validate(questions.findById(id).orElseThrow(() -> CurrentUser.notFound("Question")), in));
    }

    /** Questions are deactivated, not deleted, so past attempts stay consistent. */
    @DeleteMapping("/questions/{id}")
    public Map<String, String> delete(@PathVariable UUID id) {
        QuizQuestion q = questions.findById(id).orElseThrow(() -> CurrentUser.notFound("Question"));
        q.setActive(false);
        questions.save(q);
        return Map.of("status", "deleted");
    }

    /**
     * Bulk import, one question per line (Excel « CSV séparateur point-virgule »):
     * matière;niveau;question;réponse 1;réponse 2;[réponse 3…6];numéro de la bonne réponse (1 = première)
     */
    @PostMapping("/questions/import")
    @Transactional
    public ImportResult importCsv(Authentication a, @RequestBody ImportIn in) {
        if (in.csv() == null || in.csv().isBlank()) throw CurrentUser.badRequest("Fichier vide");
        List<String> errors = new ArrayList<>();
        List<QuizQuestion> ok = new ArrayList<>();
        String[] lines = in.csv().replace("\r", "").split("\n");
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            String sep = line.contains(";") ? ";" : line.contains("\t") ? "\t" : ",";
            String[] c = line.split(java.util.regex.Pattern.quote(sep), -1);
            if (i == 0 && c.length > 0 && c[0].trim().equalsIgnoreCase("matière")) continue; // header row
            try {
                if (c.length < 6) throw new IllegalArgumentException("colonnes manquantes (au moins 6 attendues)");
                int correct = Integer.parseInt(c[c.length - 1].trim()) - 1;
                List<String> choices = Arrays.asList(Arrays.copyOfRange(c, 3, c.length - 1));
                ok.add(validate(new QuizQuestion(), new QuestionIn(c[0], c[1], c[2], choices, correct)));
            } catch (NumberFormatException e) {
                errors.add("Ligne " + (i + 1) + " : la dernière colonne doit être le numéro de la bonne réponse");
            } catch (Exception e) {
                String m = e instanceof org.springframework.web.server.ResponseStatusException r ? r.getReason() : e.getMessage();
                errors.add("Ligne " + (i + 1) + " : " + m);
            }
        }
        questions.saveAll(ok);
        log(a, "QUIZ_IMPORT", null, ok.size() + " question(s) importée(s), " + errors.size() + " erreur(s)");
        return new ImportResult(ok.size(), errors);
    }

    // ---------------------------------------------------------------- videos & suspensions

    @GetMapping("/videos")
    public List<TeacherRow> videos(@RequestParam(defaultValue = "PENDING") String status) {
        return teachers.findTop100ByVideoStatusOrderByUpdatedAtDesc(status.toUpperCase(Locale.ROOT)).stream().map(this::row).toList();
    }

    @PatchMapping("/videos/{profileId}")
    public TeacherRow reviewVideo(Authentication a, @PathVariable UUID profileId, @RequestParam String status,
                                  @RequestParam(required = false) String reason) {
        TeacherProfile p = service.reviewVideo(profileId, status, reason);
        log(a, "VIDEO_" + status.toUpperCase(Locale.ROOT), profileId, reason);
        return row(p);
    }

    @GetMapping("/suspended")
    public List<TeacherRow> suspended() {
        return teachers.findBySuspendedTrue().stream().map(this::row).toList();
    }

    @PatchMapping("/teachers/{profileId}/suspension")
    public TeacherRow suspension(Authentication a, @PathVariable UUID profileId, @RequestParam boolean suspended,
                                 @RequestParam(required = false) String reason) {
        TeacherProfile p = service.setSuspended(profileId, suspended, reason);
        log(a, suspended ? "TEACHER_SUSPEND" : "TEACHER_UNSUSPEND", profileId, reason);
        return row(p);
    }

    // ---------------------------------------------------------------- reports

    @GetMapping("/reports")
    public PageResponse<TeacherReport> reports(@RequestParam(defaultValue = "OPEN") String status,
                                               @RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        Page<TeacherReport> p = reports.findByStatusOrderByCreatedAtDesc(status.toUpperCase(Locale.ROOT),
                PageRequest.of(Math.max(page, 0), PageResponse.size(size, 20)));
        Map<UUID, String> n = names.of(p.getContent().stream().flatMap(r -> java.util.stream.Stream.of(r.getReporterId(), r.getTeacherId())).toList());
        p.getContent().forEach(r -> {
            r.setReporterName(n.getOrDefault(r.getReporterId(), "Utilisateur"));
            r.setTeacherName(n.getOrDefault(r.getTeacherId(), "Enseignant"));
            r.setTeacherProfileId(teachers.findByUserId(r.getTeacherId()).map(TeacherProfile::getId).orElse(null));
        });
        return PageResponse.of(p);
    }

    @PatchMapping("/reports/{id}")
    public TeacherReport resolve(Authentication a, @PathVariable UUID id, @RequestBody Resolve in) {
        TeacherReport r = service.resolve(id, in.resolution(), in.suspend());
        log(a, in.suspend() ? "REPORT_RESOLVE_SUSPEND" : "REPORT_RESOLVE", id, in.resolution());
        return r;
    }
}
