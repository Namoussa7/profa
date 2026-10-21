package com.profa.document;

import com.profa.security.CurrentUser;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    final TeacherDocumentRepository r;
    final DocumentService service;

    public DocumentController(TeacherDocumentRepository r, DocumentService s) {
        this.r = r; service = s;
    }

    public record Requirements(List<String> required, List<String> missing, boolean complete, long maxBytes) {}

    @GetMapping("/mine")
    @PreAuthorize("hasRole('TEACHER')")
    public List<TeacherDocument> mine(Authentication a) {
        return r.findByTeacherIdOrderByCreatedAtDesc(CurrentUser.id(a));
    }

    /** What the teacher still has to send (drives the mandatory step in the UI). */
    @GetMapping("/requirements")
    @PreAuthorize("hasRole('TEACHER')")
    public Requirements requirements(Authentication a) {
        List<TeacherDocument> list = r.findByTeacherId(CurrentUser.id(a));
        List<String> missing = DocumentService.REQUIRED.stream().filter(t -> list.stream()
                .noneMatch(d -> t.equals(d.getType()) && d.isHasFile() && !"REJECTED".equals(d.getStatus()))).toList();
        return new Requirements(DocumentService.REQUIRED, missing, missing.isEmpty(), DocumentService.MAX_BYTES);
    }

    /** multipart/form-data: type=CV|DIPLOMA|…, file=PDF (5 MB max). */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('TEACHER')")
    public TeacherDocument upload(Authentication a, @RequestParam String type, @RequestParam("file") MultipartFile file) {
        return service.upload(CurrentUser.id(a), type, file);
    }

    /** Documents of a teacher, for admins and for schools the teacher applied to (open the CV from the ATS). */
    @GetMapping("/teacher/{teacherUserId}")
    public List<TeacherDocument> ofTeacher(Authentication a, @PathVariable UUID teacherUserId) {
        List<TeacherDocument> list = r.findByTeacherIdOrderByCreatedAtDesc(teacherUserId);
        TeacherDocument probe = new TeacherDocument();
        probe.setTeacherId(teacherUserId);
        if (!service.canRead(a, probe)) throw CurrentUser.forbidden();
        return list;
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public Map<String, String> delete(Authentication a, @PathVariable UUID id) {
        service.delete(CurrentUser.id(a), id);
        return Map.of("status", "deleted");
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> file(Authentication a, @PathVariable UUID id) {
        TeacherDocument d = r.findById(id).orElseThrow(() -> CurrentUser.notFound("Document"));
        if (!service.canRead(a, d)) throw CurrentUser.forbidden();
        byte[] data = service.content(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(d.getFileName() == null ? "document.pdf" : d.getFileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(data);
    }
}
