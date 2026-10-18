package com.keystone.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Autowired
    public WebSocketAuthChannelInterceptor(JwtTokenProvider jwtTokenProvider, CustomUserDetailsService userDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            List<String> auth = accessor.getNativeHeader("Authorization");
            String token = null;
            if (auth != null && !auth.isEmpty()) token = auth.get(0);
            if (token == null) token = accessor.getFirstNativeHeader("token");
            if (token != null && token.startsWith("Bearer ")) token = token.substring(7);

            if (token != null && jwtTokenProvider.validateToken(token)) {
                String username = jwtTokenProvider.getUsernameFromToken(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                accessor.setUser(authToken);
            }
        }

        if (StompCommand.SUBSCRIBE.equals(command) || StompCommand.SEND.equals(command)) {
            if (accessor.getUser() == null) {
                throw new AccessDeniedException("WebSocket connection not authenticated");
            }

            String destination = accessor.getDestination();
            if (destination != null) {
                Set<String> requiredRoles = requiredRolesForDestination(destination);
                if (requiredRoles != null && !requiredRoles.isEmpty()) {
                    Authentication auth = (Authentication) accessor.getUser();
                    Set<String> userRoles = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
                    boolean allowed = userRoles.stream().anyMatch(requiredRoles::contains);
                    if (!allowed) {
                        throw new AccessDeniedException("Insufficient role for destination: " + destination);
                    }
                }
            }
        }

        return message;
    }

    private Set<String> requiredRolesForDestination(String destination) {
        // Map destination prefixes to required roles (authority strings follow RoleName enum values)
        if (destination.startsWith("/topic/dispatch") || destination.startsWith("/app/dispatch")) {
            return Set.of("ROLE_DISPATCHER");
        }
        if (destination.startsWith("/topic/admin") || destination.startsWith("/app/admin")) {
            return Set.of("ROLE_MANAGER");
        }
        // Add more rules as needed
        return null;
    }
}
