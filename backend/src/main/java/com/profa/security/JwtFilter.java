package com.profa.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Component
public class JwtFilter implements Filter {

    final JwtService jwt;
    final UserStatusCache status;

    public JwtFilter(JwtService j, UserStatusCache s) {
        jwt = j; status = s;
    }

    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest r = (HttpServletRequest) req;
        String h = r.getHeader("Authorization");
        if (h != null && h.startsWith("Bearer ")) {
            try {
                var c = jwt.parse(h.substring(7)).getPayload();
                UUID id = UUID.fromString(c.getSubject());
                var s = status.get(id);
                // Deleted or blocked account, or token issued before the last password change: ignore the token.
                boolean revoked = !s.exists() || !s.enabled()
                        || (s.passwordChangedAt() != null && c.getIssuedAt() != null
                            && c.getIssuedAt().toInstant().isBefore(s.passwordChangedAt().truncatedTo(ChronoUnit.SECONDS)));
                if (!revoked) {
                    var auth = new UsernamePasswordAuthenticationToken(c.getSubject(), null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + c.get("role", String.class))));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception ignored) {
            }
        }
        chain.doFilter(req, res);
    }
}
