package com.profa.certification;

import com.profa.billing.BillingService;
import com.profa.billing.PlatformSettings;
import com.profa.security.CurrentUser;
import com.profa.teacher.TeacherProfile;
import com.profa.teacher.TeacherRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class CertificationController {

    final CertificationService service;
    final TeacherCertificationRepository certifications;
    final TeacherRepository teachers;
    final BillingService billing;

    public CertificationController(CertificationService service, TeacherCertificationRepository certifications,
                                   TeacherRepository teachers, BillingService billing) {
        this.service = service; this.certifications = certifications; this.teachers = teachers; this.billing = billing;
    }

    public record Step(String key, String label, boolean done, String detail) {}

    public record Status(boolean certified, boolean homeSafe, boolean suspended, String suspendedReason, String videoStatus,
                         String videoRejectionReason, List<Step> steps, List<TeacherCertification> certifications,
                         List<CertificationService.CatalogItem> catalog, int passScore, int durationMinutes, int questionCount,
                         boolean requireCertification, boolean requireRecordForHome) {}

    public record Start(String subject, String level) {}

    public record Submit(Map<String, Integer> answers) {}

    public record Report(UUID teacherId, String reason, String details) {}

    /** Teacher: where they stand in the certification path, and which tests they can take. */
    @GetMapping("/certification/status")
    @PreAuthorize("hasRole('TEACHER')")
    public Status status(Authentication a) {
        UUID me = CurrentUser.id(a);
        TeacherProfile p = teachers.findByUserId(me).orElseThrow(() -> CurrentUser.notFound("Profil"));
        PlatformSettings s = billing.settings();
        List<TeacherCertification> certs = certifications.findByTeacherIdOrderBySubjectAsc(me);
        boolean home = p.getTeachingModes() != null && p.getTeachingModes().contains("HOME");
        List<Step> steps = new ArrayList<>(List.of(
                new Step("DOCUMENTS", "CV et diplôme en PDF", p.isDocumentsComplete(), p.isDocumentsComplete() ? "Envoyés" : "À envoyer depuis votre espace"),
                new Step("VERIFIED", "Documents validés par Profa", p.isVerified(), p.isVerified() ? "Badge « Vérifié »" : "En attente de vérification"),
                new Step("TEST", "Test de connaissances réussi", !certs.isEmpty(), certs.isEmpty() ? "Au moins une matière" : certs.size() + " matière(s) certifiée(s)"),
                new Step("VIDEO", "Vidéo de présentation validée", "APPROVED".equals(p.getVideoStatus()), switch (p.getVideoStatus()) {
                    case "PENDING" -> "En cours de vérification";
                    case "REJECTED" -> "Refusée : " + p.getVideoRejectionReason();
                    case "APPROVED" -> "Validée";
                    default -> "Ajoutez un lien vidéo dans votre profil";
                })));
        if (home || s.isRequireRecordForHome())
            steps.add(new Step("RECORD", "Casier judiciaire (cours à domicile)", p.isHomeSafe(),
                    p.isHomeSafe() ? "Badge « Domicile sécurisé »" : "Envoyez-le en PDF (type « Casier judiciaire »)"));
        return new Status(p.isCertified(), p.isHomeSafe(), p.isSuspended(), p.getSuspendedReason(), p.getVideoStatus(),
                p.getVideoRejectionReason(), steps, certs, service.catalog(me), s.getQuizPassScore(), s.getQuizDurationMinutes(),
                s.getQuizQuestionCount(), s.isRequireCertification(), s.isRequireRecordForHome());
    }

    @PostMapping("/certification/attempts")
    @PreAuthorize("hasRole('TEACHER')")
    public CertificationService.AttemptView start(Authentication a, @RequestBody Start in) {
        return service.start(CurrentUser.id(a), in.subject(), in.level());
    }

    @PostMapping("/certification/attempts/{id}/submit")
    @PreAuthorize("hasRole('TEACHER')")
    public CertificationService.Result submit(Authentication a, @PathVariable UUID id, @RequestBody Submit in) {
        return service.submit(CurrentUser.id(a), id, in.answers());
    }

    /** Parents and schools can report a problem with a teacher. */
    @PostMapping("/reports")
    @PreAuthorize("hasAnyRole('PARENT','SCHOOL')")
    public Map<String, String> report(Authentication a, @RequestBody Report in) {
        service.report(CurrentUser.id(a), in.teacherId(), in.reason(), in.details());
        return Map.of("message", "Merci, votre signalement a été transmis à l'équipe Profa.");
    }
}
