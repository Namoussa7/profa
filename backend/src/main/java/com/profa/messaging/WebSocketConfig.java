package com.profa.messaging;

import com.profa.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.*;

import java.util.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwt;
    private final ConversationRepository conversations;

    @Value("${app.cors.allowed-origins:http://localhost:4200,http://localhost}")
    private String origins;

    public WebSocketConfig(JwtService jwt, ConversationRepository conversations) {
        this.jwt = jwt;
        this.conversations = conversations;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry r) {
        r.enableSimpleBroker("/topic");
        r.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry r) {
        // Same origins as the REST API instead of "*".
        r.addEndpoint("/ws").setAllowedOriginPatterns(Arrays.stream(origins.split(",")).map(String::trim).toArray(String[]::new));
    }

    /** Authenticates STOMP CONNECT with "Authorization: Bearer <jwt>" and restricts conversation subscriptions to participants. */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (acc == null || acc.getCommand() == null) return message;
                if (StompCommand.CONNECT.equals(acc.getCommand())) {
                    String h = acc.getFirstNativeHeader("Authorization");
                    if (h == null || !h.startsWith("Bearer ")) throw new AccessDeniedException("Token requis");
                    try {
                        var claims = jwt.parse(h.substring(7)).getPayload();
                        acc.setUser(new UsernamePasswordAuthenticationToken(claims.getSubject(), null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + claims.get("role", String.class)))));
                    } catch (Exception e) {
                        throw new AccessDeniedException("Token invalide");
                    }
                } else if (acc.getUser() == null) {
                    throw new AccessDeniedException("Non authentifié");
                }
                if (StompCommand.SUBSCRIBE.equals(acc.getCommand())) {
                    String dest = acc.getDestination();
                    String prefix = "/topic/conversation/";
                    if (dest == null || !dest.startsWith(prefix)) throw new AccessDeniedException("Destination interdite");
                    UUID me = UUID.fromString(((Authentication) acc.getUser()).getName());
                    UUID conv = UUID.fromString(dest.substring(prefix.length()));
                    boolean ok = conversations.findById(conv).map(c -> c.hasParticipant(me)).orElse(false);
                    if (!ok) throw new AccessDeniedException("Conversation interdite");
                }
                return message;
            }
        });
    }
}
