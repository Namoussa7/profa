package com.profa.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.util.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:http://localhost:4200,http://localhost}")
    String origins;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain filter(HttpSecurity h, JwtFilter f) throws Exception {
        return h.csrf(x -> x.disable())
                .cors(x -> x.configurationSource(cors()))
                .sessionManagement(x -> x.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 401 (not 403) when no/expired token, so the frontend can redirect to the login page.
                .exceptionHandling(x -> x.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .headers(x -> x.frameOptions(fo -> fo.deny()))
                .authorizeHttpRequests(x -> x
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/**", "/api/v1/public/**", "/actuator/health", "/actuator/health/**").permitAll()
                        // Spring forwards errors to /error: without this, a 400/404/405 would be turned into a 401.
                        .requestMatchers("/error").permitAll()
                        // Public marketplace browsing (like Superprof / Preply): teachers and reviews.
                        // Job offers are B2B: only teachers, schools and admins (checked in JobController).
                        .requestMatchers(HttpMethod.GET, "/api/v1/teachers", "/api/v1/teachers/*", "/api/v1/reviews/teacher/*").permitAll()
                        // Payment provider callbacks are authenticated by a shared secret header, not a JWT.
                        .requestMatchers(HttpMethod.POST, "/api/v1/payments/webhook/*").permitAll()
                        // WebSocket handshake; STOMP CONNECT is authenticated in WebSocketConfig.
                        .requestMatchers("/ws", "/ws/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(new RateLimitFilter(), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(f, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /** JwtFilter is a @Component: keep it only inside the security chain (not a second time as a servlet filter). */
    @Bean
    FilterRegistrationBean<JwtFilter> jwtFilterRegistration(JwtFilter f) {
        FilterRegistrationBean<JwtFilter> r = new FilterRegistrationBean<>(f);
        r.setEnabled(false);
        return r;
    }

    @Bean
    CorsConfigurationSource cors() {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("*"));
        c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/**", c);
        return s;
    }
}
