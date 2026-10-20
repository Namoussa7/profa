package com.profa.document;

import com.profa.security.CurrentUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.*;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    static final Set<String> TYPES = Set.of("DIPLOMA", "ID_CARD", "CV", "CRIMINAL_RECORD", "CERTIFICATE", "OTHER");

    final TeacherDocumentRepository r;

    public DocumentController(TeacherDocumentRepository r) {
        this.r = r;
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('TEACHER')")
    public List<TeacherDocument> mine(Authentication a) {
        return r.findByTeacherId(CurrentUser.id(a));
    }

    /** Registers a document by URL (file storage such as S3/Cloudinary/Drive is external). */
    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    public TeacherDocument add(Authentication a, @RequestBody TeacherDocument in) {
        String type = in.getType() == null ? "OTHER" : in.getType().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(type)) throw CurrentUser.badRequest("Type de document invalide");
        String url = in.getFileUrl() == null ? "" : in.getFileUrl().trim();
        try {
            String scheme = URI.create(url).getScheme();
            if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) {
            throw CurrentUser.badRequest("Lien du document invalide (http/https)");
        }
        TeacherDocument x = new TeacherDocument();
        x.setTeacherId(CurrentUser.id(a));
        x.setType(type);
        x.setFileUrl(url);
        return r.save(x);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public Map<String, String> delete(Authentication a, @PathVariable UUID id) {
        TeacherDocument d = r.findById(id).orElseThrow(() -> CurrentUser.notFound("Document"));
        if (!CurrentUser.id(a).equals(d.getTeacherId())) throw CurrentUser.forbidden();
        if ("APPROVED".equals(d.getStatus())) throw CurrentUser.badRequest("Un document approuvé ne peut pas être supprimé");
        r.delete(d);
        return Map.of("status", "deleted");
    }
}
