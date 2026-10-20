package com.profa.messaging;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
    Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(UUID conversationId);
    long countByConversationIdAndSenderIdNotAndReadFalse(UUID conversationId, UUID senderId);
}
