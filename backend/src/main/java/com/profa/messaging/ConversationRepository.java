package com.profa.messaging;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    List<Conversation> findByUserAOrUserBOrderByUpdatedAtDesc(UUID userA, UUID userB);
    List<Conversation> findTop50ByUserAOrUserBOrderByUpdatedAtDesc(UUID userA, UUID userB);
}
