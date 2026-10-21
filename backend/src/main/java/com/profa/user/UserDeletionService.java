package com.profa.user;

import com.profa.security.UserStatusCache;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Permanently deletes an account and the data that only makes sense with it
 * (profiles, documents, messages, favorites, notifications, job offers, requests).
 * Bookings and payments are kept as accounting history; their author is shown as "Utilisateur".
 */
@Service
public class UserDeletionService {

    private static final String[] STATEMENTS = {
            "delete from document_files where document_id in (select id from teacher_documents where teacher_id = :id)",
            "delete from teacher_documents where teacher_id = :id",
            "delete from teacher_profiles where user_id = :id",
            "delete from school_profiles where user_id = :id",
            "delete from favorites where user_id = :id or teacher_user_id = :id",
            "delete from notifications where user_id = :id",
            "delete from messages where conversation_id in (select id from conversations where user_a = :id or user_b = :id)",
            "delete from conversations where user_a = :id or user_b = :id",
            "delete from applications where teacher_id = :id or job_id in (select id from job_offers where school_id = :id)",
            "delete from job_offers where school_id = :id",
            "delete from course_requests where parent_id = :id or teacher_id = :id",
            "delete from reviews where teacher_id = :id",
            "delete from password_reset_tokens where user_id = :id",
            "delete from users where id = :id",
    };

    private final EntityManager em;
    private final UserStatusCache status;

    public UserDeletionService(EntityManager em, UserStatusCache status) {
        this.em = em;
        this.status = status;
    }

    @Transactional
    public void delete(UUID userId) {
        for (String sql : STATEMENTS) {
            em.createNativeQuery(sql).setParameter("id", userId).executeUpdate();
        }
        status.evict(userId);
    }
}
