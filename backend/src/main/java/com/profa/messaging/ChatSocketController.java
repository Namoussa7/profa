package com.profa.messaging;

import com.profa.security.CurrentUser;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
public class ChatSocketController {

    final MessagingService service;

    public ChatSocketController(MessagingService s) {
        service = s;
    }

    /** STOMP: SEND /app/chat.send {conversationId, body}. The sender is the authenticated user, never the payload. */
    @MessageMapping("/chat.send")
    public void send(Principal principal, ChatMessage m) {
        if (!(principal instanceof Authentication auth)) throw CurrentUser.forbidden();
        service.send(CurrentUser.id(auth), UUID.fromString(m.conversationId()), m.body());
    }

    public record ChatMessage(String conversationId, String body) {}
}
