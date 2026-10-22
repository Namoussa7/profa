package com.profa.payment;

import com.profa.billing.BillingService;
import com.profa.booking.Booking;
import com.profa.booking.BookingRepository;
import com.profa.notification.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/** Applies a payment status change and keeps the related booking in sync. */
@Service
public class PaymentService {

    private final PaymentRepository payments;
    private final BookingRepository bookings;
    private final NotificationService notifications;
    private final BillingService billing;

    public PaymentService(PaymentRepository p, BookingRepository b, NotificationService n, BillingService billing) {
        payments = p; bookings = b; notifications = n; this.billing = billing;
    }

    @Transactional
    public Payment apply(Payment p, String rawStatus) {
        String status = switch (rawStatus.toUpperCase(Locale.ROOT)) {
            case "SUCCESS", "SUCCESSFUL", "PAID", "ACCEPTED", "CONFIRMED", "COMPLETED" -> "CONFIRMED";
            case "FAILED", "REFUSED", "CANCELLED", "CANCELED", "EXPIRED" -> "FAILED";
            case "REFUNDED" -> "REFUNDED";
            default -> "PENDING";
        };
        if ("CONFIRMED".equals(p.getStatus()) && "PENDING".equals(status)) return p; // never downgrade
        p.setStatus(status);
        Booking b = p.getBookingId() == null ? null : bookings.findById(p.getBookingId()).orElse(null);
        // Platform commission / teacher share, frozen once at confirmation.
        if ("CONFIRMED".equals(status)) billing.applySplit(p, b);
        Payment saved = payments.save(p);
        if (b != null) {
            if ("CONFIRMED".equals(status)) {
                b.setPaymentStatus("PAID");
                if ("PENDING_PAYMENT".equals(b.getStatus())) b.setStatus("CONFIRMED");
                notifications.notify(b.getTeacherId(), "PAYMENT", "Paiement reçu",
                        "Le cours réservé a été payé et confirmé.", "/dashboard");
                notifications.notify(b.getParentId(), "PAYMENT", "Paiement confirmé",
                        "Votre paiement a été reçu. Bon cours !", "/dashboard");
            } else if ("REFUNDED".equals(status)) {
                b.setPaymentStatus("REFUNDED");
            }
            bookings.save(b);
        }
        return saved;
    }
}
