package com.profa.payment;

import com.profa.booking.Booking;
import com.profa.booking.BookingRepository;
import com.profa.security.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    static final Set<String> METHODS = Set.of("ORANGE_MONEY", "MOOV_MONEY", "WAVE", "CARD", "CASH");

    final PaymentRepository r;
    final BookingRepository bookings;
    final PaymentService service;

    @Value("${app.payments.webhook-secret:}")
    String webhookSecret;

    public PaymentController(PaymentRepository r, BookingRepository b, PaymentService s) {
        this.r = r; bookings = b; service = s;
    }

    public record Initiate(UUID bookingId, String method, String provider) {}

    @GetMapping("/mine")
    public List<Payment> mine(Authentication a) {
        return r.findByPayerIdOrderByCreatedAtDesc(CurrentUser.id(a));
    }

    /**
     * Creates a pending payment for one of the payer's bookings. The amount always comes from the booking.
     * The returned externalReference is what the payment provider (Orange Money, Moov, Wave, CinetPay…) sends back in its webhook.
     */
    @PostMapping
    @PreAuthorize("hasRole('PARENT')")
    public Payment initiate(Authentication a, @RequestBody Initiate in) {
        UUID me = CurrentUser.id(a);
        if (in.bookingId() == null) throw CurrentUser.badRequest("Réservation requise");
        Booking b = bookings.findById(in.bookingId()).orElseThrow(() -> CurrentUser.notFound("Réservation"));
        if (!me.equals(b.getParentId())) throw CurrentUser.forbidden();
        if ("PAID".equals(b.getPaymentStatus())) throw CurrentUser.badRequest("Cette réservation est déjà payée");
        if ("CANCELLED".equals(b.getStatus())) throw CurrentUser.badRequest("Réservation annulée");
        String method = in.method() == null ? "ORANGE_MONEY" : in.method().toUpperCase(Locale.ROOT);
        if (!METHODS.contains(method)) throw CurrentUser.badRequest("Moyen de paiement non pris en charge");
        Payment p = new Payment();
        p.setBookingId(b.getId());
        p.setPayerId(me);
        p.setAmount(b.getAmount());
        p.setMethod(method);
        p.setProvider(in.provider() == null ? method : in.provider());
        p.setExternalReference("PRF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(Locale.ROOT));
        p.setStatus("PENDING");
        return r.save(p);
    }

    /**
     * Provider callback. Requires header X-Webhook-Secret = PAYMENT_WEBHOOK_SECRET.
     * Body: {"reference": "PRF-…", "status": "SUCCESS|FAILED|…"}. Adapt the mapping to the provider's exact payload.
     */
    @PostMapping("/webhook/{provider}")
    public ResponseEntity<Map<String, String>> webhook(@PathVariable String provider,
                                                       @RequestHeader(value = "X-Webhook-Secret", required = false) String secret,
                                                       @RequestBody Map<String, Object> payload) {
        if (webhookSecret == null || webhookSecret.isBlank())
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("status", "webhook not configured"));
        if (secret == null || !MessageDigest.isEqual(secret.getBytes(StandardCharsets.UTF_8), webhookSecret.getBytes(StandardCharsets.UTF_8)))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("status", "invalid signature"));
        Object ref = payload.getOrDefault("reference", payload.get("externalReference"));
        Object status = payload.get("status");
        if (ref == null || status == null) return ResponseEntity.badRequest().body(Map.of("status", "missing reference or status"));
        Payment p = r.findByExternalReference(ref.toString()).orElse(null);
        if (p == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("status", "unknown reference"));
        service.apply(p, status.toString());
        return ResponseEntity.ok(Map.of("status", "accepted", "provider", provider));
    }
}
