package com.profa.security;

import com.profa.user.UserRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short-lived cache of account status used on every authenticated request, so that blocking,
 * deleting an account or changing a password takes effect within seconds without a DB hit per request.
 */
@Component
public class UserStatusCache {

    public record Status(boolean exists, boolean enabled, Instant passwordChangedAt, long loadedAt) {}

    private static final long TTL_MS = 30_000;
    private static final int MAX_ENTRIES = 50_000;

    private final UserRepository users;
    private final Map<UUID, Status> cache = new ConcurrentHashMap<>();

    public UserStatusCache(UserRepository users) {
        this.users = users;
    }

    public Status get(UUID id) {
        long now = System.currentTimeMillis();
        Status s = cache.get(id);
        if (s != null && now - s.loadedAt() < TTL_MS) return s;
        if (cache.size() > MAX_ENTRIES) cache.clear();
        Status fresh = users.findById(id)
                .map(u -> new Status(true, u.isEnabled(), u.getPasswordChangedAt(), now))
                .orElse(new Status(false, false, null, now));
        cache.put(id, fresh);
        return fresh;
    }

    public void evict(UUID id) {
        cache.remove(id);
    }
}
