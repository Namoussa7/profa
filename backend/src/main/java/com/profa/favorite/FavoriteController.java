package com.profa.favorite;

import com.profa.security.CurrentUser;
import com.profa.teacher.TeacherRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** Saved teachers ("favoris"), keyed by the teacher's user id. */
@RestController
@RequestMapping("/api/v1/favorites")
public class FavoriteController {

    final FavoriteRepository r;
    final TeacherRepository teachers;

    public FavoriteController(FavoriteRepository r, TeacherRepository t) {
        this.r = r; teachers = t;
    }

    @GetMapping
    public List<UUID> mine(Authentication a) {
        return r.findByUserId(CurrentUser.id(a)).stream().map(Favorite::getTeacherUserId).toList();
    }

    @PostMapping("/{teacherUserId}")
    public Map<String, Boolean> add(Authentication a, @PathVariable UUID teacherUserId) {
        UUID me = CurrentUser.id(a);
        teachers.findByUserId(teacherUserId).orElseThrow(() -> CurrentUser.notFound("Enseignant"));
        if (r.findByUserIdAndTeacherUserId(me, teacherUserId).isEmpty()) {
            Favorite f = new Favorite();
            f.setUserId(me);
            f.setTeacherUserId(teacherUserId);
            r.save(f);
        }
        return Map.of("favorite", true);
    }

    @DeleteMapping("/{teacherUserId}")
    public Map<String, Boolean> remove(Authentication a, @PathVariable UUID teacherUserId) {
        r.findByUserIdAndTeacherUserId(CurrentUser.id(a), teacherUserId).ifPresent(r::delete);
        return Map.of("favorite", false);
    }
}
