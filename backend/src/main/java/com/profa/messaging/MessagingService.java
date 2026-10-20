package com.profa.messaging;

import com.profa.notification.NotificationService;
import com.profa.security.CurrentUser;
import com.profa.user.UserNames;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class MessagingService {

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final SimpMessagingTemplate broker;
    private final NotificationService notifications;
    private final UserNames names;

    public MessagingService(ConversationRepository c, MessageRepository m, SimpMessagingTemplate b,
                            NotificationService n, UserNames names) {
        conversations = c; messages = m; broker = b; notifications = n; this.names = names;
    }

    public Conversation participantConversation(UUID conversationId, UUID user) {
        Conversation c = conversations.findById(conversationId).orElseThrow(() -> CurrentUser.notFound("Conversation"));
        if (!c.hasParticipant(user)) throw CurrentUser.forbidden();
        return c;
    }

    /** Persists the message, then pushes it to WebSocket subscribers of the conversation. */
    public Message send(UUID sender, UUID conversationId, String body) {
        if (body == null || body.isBlank()) throw CurrentUser.badRequest("Message vide");
        if (body.length() > 5000) throw CurrentUser.badRequest("Message trop long (5000 caractères max)");
        Conversation c = participantConversation(conversationId, sender);
        Message m = new Message();
        m.setConversationId(c.getId());
        m.setSenderId(sender);
        m.setBody(body.trim());
        Message saved = messages.save(m);
        c.setUpdatedAt(Instant.now());
        conversations.save(c);
        broker.convertAndSend("/topic/conversation/" + c.getId(), saved);
        notifications.notify(c.other(sender), "MESSAGE", "Nouveau message de " + names.of(sender),
                saved.getBody().length() > 80 ? saved.getBody().substring(0, 80) + "…" : saved.getBody(), "/messages");
        return saved;
    }
}
