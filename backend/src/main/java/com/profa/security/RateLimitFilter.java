package com.profa.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window limiter on authentication endpoints (login, register, forgot/reset password):
 * slows down password guessing and account-creation spam. Per instance, per client IP.
 */
public class RateLimitFilter implements Filter {

    private static final int MAX_PER_WINDOW = 10;
    private static final long WINDOW_MS = 60_000;

    private record Window(long start, AtomicInteger count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest r = (HttpServletRequest) req;
        if (!"POST".equals(r.getMethod()) || !r.getRequestURI().startsWith("/api/v1/auth/")) {
            chain.doFilter(req, res);
            return;
        }
        String key = clientIp(r) + "|" + r.getRequestURI();
        long now = System.currentTimeMillis();
        if (windows.size() > 100_000) windows.clear();
        Window w = windows.compute(key, (k, old) -> old == null || now - old.start() > WINDOW_MS ? new Window(now, new AtomicInteger()) : old);
        if (w.count().incrementAndGet() > MAX_PER_WINDOW) {
            HttpServletResponse out = (HttpServletResponse) res;
            out.setStatus(429);
            out.setContentType("application/json;charset=UTF-8");
            out.setHeader("Retry-After", "60");
            out.getWriter().write("{\"message\":\"Trop de tentatives. Réessayez dans une minute.\"}");
            return;
        }
        chain.doFilter(req, res);
    }

    /** Render (and most hosts) put the real client IP first in X-Forwarded-For. */
    static String clientIp(HttpServletRequest r) {
        String fwd = r.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) return fwd.split(",")[0].trim();
        return r.getRemoteAddr();
    }
}
