package com.profa.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Properties;

/**
 * Transactional e-mails over SMTP (Brevo, Mailjet, Gmail…). Disabled when MAIL_HOST is empty:
 * the platform keeps working and administrators can hand out reset links themselves.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSenderImpl sender;
    private final String from;

    public MailService(@Value("${app.mail.host:}") String host,
                       @Value("${app.mail.port:587}") int port,
                       @Value("${app.mail.username:}") String username,
                       @Value("${app.mail.password:}") String password,
                       @Value("${app.mail.from:no-reply@profa.ml}") String from) {
        this.from = from;
        if (host == null || host.isBlank()) {
            sender = null;
            log.info("[PROFA] E-mails désactivés : MAIL_HOST non configuré.");
            return;
        }
        sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);
        sender.setDefaultEncoding("UTF-8");
        Properties p = sender.getJavaMailProperties();
        p.put("mail.smtp.auth", String.valueOf(!username.isBlank()));
        p.put("mail.smtp.starttls.enable", "true");
        p.put("mail.smtp.connectiontimeout", "10000");
        p.put("mail.smtp.timeout", "10000");
    }

    public boolean enabled() {
        return sender != null;
    }

    /** Sent off the request thread so a slow SMTP server never slows the API down. */
    @Async
    public void send(String to, String subject, String text) {
        if (sender == null) return;
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(from);
            m.setTo(to);
            m.setSubject(subject);
            m.setText(text);
            sender.send(m);
        } catch (Exception e) {
            log.warn("[PROFA] Échec d'envoi d'e-mail à {} : {}", to, e.getMessage());
        }
    }
}
