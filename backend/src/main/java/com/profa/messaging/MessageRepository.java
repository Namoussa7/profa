package com.profa.messaging;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
    Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(UUID conversationId);
    long countByConversationIdAndSenderIdNotAndReadFalse(UUID conversationId, UUID senderId);

    /** Unread messages for a user across all conversations, in a single query (polled by every open page). */
    @Query("select count(m) from Message m where m.read = false and m.senderId <> :me and m.conversationId in "
            + "(select c.id from Conversation c where c.userA = :me or c.userB = :me)")
    long unreadFor(@Param("me") UUID me);
}
