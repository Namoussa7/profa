package com.profa.messaging;

import com.profa.security.CurrentUser;
import com.profa.user.UserNames;
import com.profa.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/messaging")
public class MessagingController {

    final ConversationRepository c;
    final MessageRepository m;
    final MessagingService service;
    final UserRepository users;
    final UserNames names;

    public MessagingController(ConversationRepository c, MessageRepository m, MessagingService s, UserRepository u, UserNames n) {
        this.c = c; this.m = m; service = s; users = u; names = n;
    }

    public record ConversationView(UUID id, UUID otherUserId, String otherName, String lastMessage,
                                   Instant updatedAt, long unread) {}

    public record StartConversation(UUID userId) {}

    public record SendMessage(UUID conversationId, String body) {}

    private ConversationView view(Conversation x, UUID me) {
        UUID other = x.other(me);
        String last = m.findFirstByConversationIdOrderByCreatedAtDesc(x.getId()).map(Message::getBody).orElse(null);
        return new ConversationView(x.getId(), other, names.of(other), last, x.getUpdatedAt(),
                m.countByConversationIdAndSenderIdNotAndReadFalse(x.getId(), me));
    }

    @GetMapping("/conversations")
    public List<ConversationView> conversations(Authentication a) {
        UUID me = CurrentUser.id(a);
        return c.findByUserAOrUserBOrderByUpdatedAtDesc(me, me).stream().map(x -> view(x, me)).toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unread(Authentication a) {
        UUID me = CurrentUser.id(a);
        long total = c.findByUserAOrUserBOrderByUpdatedAtDesc(me, me).stream()
                .mapToLong(x -> m.countByConversationIdAndSenderIdNotAndReadFalse(x.getId(), me)).sum();
        return Map.of("count", total);
    }

    /** Opens (or reuses) the 1-to-1 conversation between the current user and {userId}. */
    @PostMapping("/conversations")
    public ConversationView conversation(Authentication a, @RequestBody StartConversation in) {
        UUID me = CurrentUser.id(a);
        if (in.userId() == null || in.userId().equals(me)) throw CurrentUser.badRequest("Destinataire invalide");
        users.findById(in.userId()).orElseThrow(() -> CurrentUser.notFound("Destinataire"));
        Conversation existing = c.findByUserAOrUserBOrderByUpdatedAtDesc(me, me).stream()
                .filter(x -> x.hasParticipant(in.userId())).findFirst().orElse(null);
        if (existing != null) return view(existing, me);
        Conversation x = new Conversation();
        x.setUserA(me);
        x.setUserB(in.userId());
        return view(c.save(x), me);
    }

    @GetMapping("/conversations/{id}/messages")
    @Transactional
    public List<Message> messages(Authentication a, @PathVariable UUID id) {
        UUID me = CurrentUser.id(a);
        service.participantConversation(id, me);
        List<Message> list = m.findByConversationIdOrderByCreatedAtAsc(id);
        List<Message> toMark = list.stream().filter(x -> !x.isRead() && !me.equals(x.getSenderId())).toList();
        toMark.forEach(x -> x.setRead(true));
        m.saveAll(toMark);
        return list;
    }

    @PostMapping("/messages")
    public Message message(Authentication a, @RequestBody SendMessage in) {
        if (in.conversationId() == null) throw CurrentUser.badRequest("Conversation requise");
        return service.send(CurrentUser.id(a), in.conversationId(), in.body());
    }
}
