package com.profa.document;

import com.profa.billing.BillingService;
import com.profa.certification.CertificationService;
import com.profa.job.ApplicationRepository;
import com.profa.notification.NotificationService;
import com.profa.security.CurrentUser;
import com.profa.teacher.TeacherProfile;
import com.profa.teacher.TeacherRepository;
import com.profa.user.Role;
import com.profa.user.UserNames;
import com.profa.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.*;

@Service
public class DocumentService {

    /** Documents every teacher must provide as PDF before being listed publicly. */
    public static final List<String> REQUIRED = List.of("CV", "DIPLOMA");
    public static final Set<String> TYPES = Set.of("CV", "DIPLOMA", "ID_CARD", "CERTIFICATE", "CRIMINAL_RECORD", "OTHER");
    public static final long MAX_BYTES = 5L * 1024 * 1024;

    private final TeacherDocumentRepository docs;
    private final DocumentFileRepository files;
    private final TeacherRepository teachers;
    private final UserRepository users;
    private final ApplicationRepository applications;
    private final NotificationService notifications;
    private final UserNames names;
    private final BillingService billing;
    private final CertificationService certification;

    public DocumentService(TeacherDocumentRepository docs, DocumentFileRepository files, TeacherRepository teachers,
                           UserRepository users, ApplicationRepository applications, NotificationService notifications,
                           UserNames names, BillingService billing, CertificationService certification) {
        this.docs = docs; this.files = files; this.teachers = teachers; this.users = users;
        this.applications = applications; this.notifications = notifications; this.names = names; this.billing = billing;
        this.certification = certification;
    }

    /** Uploads (or replaces) the teacher's PDF of the given type; it goes back to PENDING review. */
    @Transactional
    public TeacherDocument upload(UUID teacherId, String rawType, MultipartFile file) {
        String type = rawType == null ? "" : rawType.trim().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(type)) throw CurrentUser.badRequest("Type de document invalide");
        if (file == null || file.isEmpty()) throw CurrentUser.badRequest("Fichier manquant");
        if (file.getSize() > MAX_BYTES) throw CurrentUser.badRequest("Fichier trop volumineux (5 Mo maximum)");
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw CurrentUser.badRequest("Fichier illisible");
        }
        // Check the real content, not only the extension or the declared MIME type.
        if (data.length < 5 || !new String(data, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-"))
            throw CurrentUser.badRequest("Seuls les fichiers PDF sont acceptés");

        TeacherDocument d = docs.findFirstByTeacherIdAndTypeOrderByCreatedAtDesc(teacherId, type).orElseGet(TeacherDocument::new);
        d.setTeacherId(teacherId);
        d.setType(type);
        d.setFileUrl(null);
        d.setFileName(cleanName(file.getOriginalFilename(), type));
        d.setContentType("application/pdf");
        d.setSizeBytes((long) data.length);
        d.setStatus("PENDING");
        d.setRejectionReason(null);
        d.setReviewedAt(null);
        d.setCreatedAt(Instant.now());
        TeacherDocument saved = docs.save(d);
        files.save(new DocumentFile(saved.getId(), data));
        refresh(teacherId);
        String who = names.of(teacherId);
        users.findByRole(Role.ADMIN).forEach(a -> notifications.notify(a.getId(), "DOCUMENT", "Document à vérifier",
                who + " a envoyé : " + type, "/admin"));
        return saved;
    }

    @Transactional
    public void delete(UUID teacherId, UUID documentId) {
        TeacherDocument d = docs.findById(documentId).orElseThrow(() -> CurrentUser.notFound("Document"));
        if (!teacherId.equals(d.getTeacherId())) throw CurrentUser.forbidden();
        if ("APPROVED".equals(d.getStatus())) throw CurrentUser.badRequest("Un document approuvé ne peut pas être supprimé");
        files.deleteById(d.getId());
        docs.delete(d);
        refresh(teacherId);
    }

    /** Admin decision; when both required PDFs are approved the teacher gets the "Vérifié" badge automatically. */
    @Transactional
    public TeacherDocument review(UUID documentId, String status, String reason) {
        TeacherDocument d = docs.findById(documentId).orElseThrow(() -> CurrentUser.notFound("Document"));
        String next = status.toUpperCase(Locale.ROOT);
        if (!Set.of("PENDING", "APPROVED", "REJECTED").contains(next)) throw CurrentUser.badRequest("Statut invalide");
        if ("REJECTED".equals(next) && (reason == null || reason.isBlank()))
            throw CurrentUser.badRequest("Indiquez le motif du refus");
        d.setStatus(next);
        d.setRejectionReason("REJECTED".equals(next) ? reason.trim() : null);
        d.setReviewedAt(Instant.now());
        TeacherDocument saved = docs.save(d);
        refresh(d.getTeacherId());
        notifications.notify(d.getTeacherId(), "DOCUMENT",
                "APPROVED".equals(next) ? "Document approuvé" : "REJECTED".equals(next) ? "Document refusé" : "Document en attente",
                "REJECTED".equals(next) ? "Motif : " + reason + ". Merci d'envoyer un nouveau PDF." : "Votre document " + label(d.getType()) + " a été traité.",
                "/dashboard");
        return saved;
    }

    /** Recomputes the teacher's public visibility from the required documents. */
    @Transactional
    public void refresh(UUID teacherId) {
        TeacherProfile p = teachers.findByUserId(teacherId).orElse(null);
        if (p == null) return;
        List<TeacherDocument> list = docs.findByTeacherId(teacherId);
        boolean complete = REQUIRED.stream().allMatch(t -> list.stream()
                .anyMatch(d -> t.equals(d.getType()) && d.isHasFile() && !"REJECTED".equals(d.getStatus())));
        boolean approved = REQUIRED.stream().allMatch(t -> list.stream()
                .anyMatch(d -> t.equals(d.getType()) && d.isHasFile() && "APPROVED".equals(d.getStatus())));
        p.setDocumentsComplete(complete);
        if (approved && !p.isVerified()) {
            p.setVerified(true);
            notifications.notify(teacherId, "VERIFICATION", "Profil vérifié",
                    "Votre CV et votre diplôme ont été validés : votre profil affiche le badge « Vérifié ».", "/enseignants/" + p.getId());
        }
        teachers.save(p);
        certification.refresh(teacherId);
    }

    /** Admin, the teacher, or a school the teacher applied to (ATS) may read the PDF. */
    public boolean canRead(Authentication a, TeacherDocument d) {
        if (CurrentUser.isAdmin(a)) return true;
        UUID me = CurrentUser.id(a);
        if (me.equals(d.getTeacherId())) return true;
        if (!CurrentUser.hasRole(a, "SCHOOL") || !applications.teacherAppliedToSchool(d.getTeacherId(), me)) return false;
        if (!billing.canReadCvs(me))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.PAYMENT_REQUIRED,
                    "L'accès aux CV des candidats est inclus dans les formules Standard et Premium.");
        return true;
    }

    public byte[] content(UUID documentId) {
        return files.findById(documentId).map(DocumentFile::getData).orElseThrow(() -> CurrentUser.notFound("Fichier"));
    }

    public static String label(String type) {
        return switch (type) {
            case "CV" -> "CV";
            case "DIPLOMA" -> "Diplôme";
            case "ID_CARD" -> "Pièce d'identité";
            case "CERTIFICATE" -> "Attestation";
            case "CRIMINAL_RECORD" -> "Casier judiciaire";
            default -> "Document";
        };
    }

    private static String cleanName(String original, String type) {
        String n = original == null ? "" : original.replaceAll("[^A-Za-z0-9._ -]", "_").trim();
        if (n.isBlank()) n = type.toLowerCase(Locale.ROOT) + ".pdf";
        if (!n.toLowerCase(Locale.ROOT).endsWith(".pdf")) n += ".pdf";
        return n.length() > 120 ? n.substring(n.length() - 120) : n;
    }
}
