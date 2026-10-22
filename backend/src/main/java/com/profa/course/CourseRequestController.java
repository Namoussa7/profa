package com.profa.course;

import com.profa.notification.NotificationService;
import com.profa.security.CurrentUser;
import com.profa.teacher.TeacherRepository;
import com.profa.user.UserNames;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/v1/course-requests")
public class CourseRequestController {

    final CourseRequestRepository r;
    final TeacherRepository teachers;
    final NotificationService notifications;
    final UserNames names;

    public CourseRequestController(CourseRequestRepository r, TeacherRepository t, NotificationService n, UserNames names) {
        this.r = r; teachers = t; notifications = n; this.names = names;
    }

    private List<CourseRequest> enrich(List<CourseRequest> list) {
        Map<UUID, String> n = names.of(list.stream().flatMap(c -> Stream.of(c.getParentId(), c.getTeacherId())).toList());
        list.forEach(c -> {
            c.setParentName(n.getOrDefault(c.getParentId(), "Parent"));
            c.setTeacherName(c.getTeacherId() == null ? null : n.getOrDefault(c.getTeacherId(), "Enseignant"));
        });
        return list;
    }

    /** Parent: own requests. Teacher: requests addressed to them + open requests. Admin: all. */
    @GetMapping
    public List<CourseRequest> list(Authentication a) {
        UUID me = CurrentUser.id(a);
        if (CurrentUser.isAdmin(a)) return enrich(r.findAll());
        if (CurrentUser.hasRole(a, "TEACHER")) {
            List<CourseRequest> out = new ArrayList<>(r.findByTeacherIdOrderByCreatedAtDesc(me));
            out.addAll(r.findTop50ByTeacherIdIsNullAndStatusOrderByCreatedAtDesc("PENDING"));
            return enrich(out);
        }
        return enrich(r.findByParentIdOrderByCreatedAtDesc(me));
    }

    @PostMapping
    @PreAuthorize("hasRole('PARENT')")
    public CourseRequest create(Authentication a, @RequestBody CourseRequest in) {
        UUID me = CurrentUser.id(a);
        if (in.getSubject() == null || in.getSubject().isBlank()) throw CurrentUser.badRequest("Matière requise");
        if (in.getBudget() != null && in.getBudget() < 0) throw CurrentUser.badRequest("Budget invalide");
        if (in.getTeacherId() != null && !teachers.findByUserId(in.getTeacherId()).map(t -> t.isDocumentsComplete()).orElse(false))
            throw CurrentUser.notFound("Enseignant");
        CourseRequest x = new CourseRequest();
        x.setParentId(me);
        x.setTeacherId(in.getTeacherId());
        x.setSubject(in.getSubject().trim());
        x.setLevel(in.getLevel());
        x.setMode(in.getMode());
        x.setCity(in.getCity());
        x.setDistrict(in.getDistrict());
        x.setBudget(in.getBudget());
        x.setScheduleJson(in.getScheduleJson());
        x.setNotes(in.getNotes());
        CourseRequest saved = r.save(x);
        notifications.notify(in.getTeacherId(), "COURSE_REQUEST", "Nouvelle demande de cours",
                names.of(me) + " souhaite un cours de " + saved.getSubject(), "/dashboard");
        return saved;
    }

    @PatchMapping("/{id}/status")
    public CourseRequest status(Authentication a, @PathVariable UUID id, @RequestParam String value) {
        UUID me = CurrentUser.id(a);
        CourseRequest x = r.findById(id).orElseThrow(() -> CurrentUser.notFound("Demande"));
        String next = value.toUpperCase(Locale.ROOT);
        boolean isParent = me.equals(x.getParentId());
        boolean isTarget = me.equals(x.getTeacherId())
                || (x.getTeacherId() == null && CurrentUser.hasRole(a, "TEACHER"));
        boolean allowed = CurrentUser.isAdmin(a)
                || (isTarget && Set.of("ACCEPTED", "DECLINED").contains(next))
                || (isParent && "CANCELLED".equals(next));
        if (!allowed) throw CurrentUser.forbidden();
        if (isTarget && "ACCEPTED".equals(next) && teachers.findByUserId(me).map(t -> t.isSuspended()).orElse(false))
            throw CurrentUser.badRequest("Votre profil est suspendu : contactez l'équipe Profa");
        if (isTarget && "ACCEPTED".equals(next) && !teachers.findByUserId(me).map(t -> t.isDocumentsComplete()).orElse(false))
            throw CurrentUser.badRequest("Envoyez d'abord votre CV et votre diplôme en PDF depuis votre espace");
        if (!"PENDING".equals(x.getStatus()) && !CurrentUser.isAdmin(a))
            throw CurrentUser.badRequest("Cette demande a déjà été traitée");
        // An open request accepted by a teacher becomes theirs.
        if ("ACCEPTED".equals(next) && x.getTeacherId() == null) x.setTeacherId(me);
        x.setStatus(next);
        CourseRequest saved = r.save(x);
        if (!isParent) {
            notifications.notify(x.getParentId(), "COURSE_REQUEST",
                    "ACCEPTED".equals(next) ? "Demande acceptée" : "Demande refusée",
                    names.of(me) + ("ACCEPTED".equals(next) ? " a accepté votre demande. Réservez un créneau !" : " n'est pas disponible."),
                    "/dashboard");
        }
        return saved;
    }
}
