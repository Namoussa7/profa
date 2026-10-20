package com.profa.notification;

import com.profa.security.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    final NotificationRepository r;

    public NotificationController(NotificationRepository r) {
        this.r = r;
    }

    @GetMapping
    public List<Notification> mine(Authentication a) {
        return r.findTop50ByUserIdOrderByCreatedAtDesc(CurrentUser.id(a));
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unread(Authentication a) {
        return Map.of("count", r.countByUserIdAndReadFalse(CurrentUser.id(a)));
    }

    @PatchMapping("/{id}/read")
    public Notification read(Authentication a, @PathVariable UUID id) {
        Notification n = r.findById(id).orElseThrow(() -> CurrentUser.notFound("Notification"));
        if (!CurrentUser.id(a).equals(n.getUserId())) throw CurrentUser.forbidden();
        n.setRead(true);
        return r.save(n);
    }

    @PatchMapping("/read-all")
    public Map<String, Integer> readAll(Authentication a) {
        List<Notification> unread = r.findByUserIdAndReadFalse(CurrentUser.id(a));
        unread.forEach(n -> n.setRead(true));
        r.saveAll(unread);
        return Map.of("updated", unread.size());
    }
}
