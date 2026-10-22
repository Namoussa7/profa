package com.profa.billing;

import com.profa.booking.Booking;
import com.profa.booking.BookingRepository;
import com.profa.job.JobRepository;
import com.profa.notification.NotificationService;
import com.profa.payment.Payment;
import com.profa.payment.PaymentRepository;
import com.profa.security.CurrentUser;
import com.profa.user.Role;
import com.profa.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Business model: commission on lessons paid through Profa, monthly plans for schools,
 * and payouts of the teachers' share. While monetization is disabled (launch phase), everything is free.
 */
@Service
public class BillingService {

    public static final Set<String> PAID_PLANS = Set.of("STANDARD", "PREMIUM");
    public static final Duration PERIOD = Duration.ofDays(30);

    public record Plan(String code, boolean paid, boolean cvAccess, boolean featured, Integer offerLimit, Instant endsAt) {}

    private final PlatformSettingsRepository settingsRepo;
    private final SchoolSubscriptionRepository subscriptions;
    private final PayoutRepository payouts;
    private final PaymentRepository payments;
    private final BookingRepository bookings;
    private final JobRepository jobs;
    private final UserRepository users;
    private final NotificationService notifications;

    public BillingService(PlatformSettingsRepository settingsRepo, SchoolSubscriptionRepository subscriptions,
                          PayoutRepository payouts, PaymentRepository payments, BookingRepository bookings,
                          JobRepository jobs, UserRepository users, NotificationService notifications) {
        this.settingsRepo = settingsRepo; this.subscriptions = subscriptions; this.payouts = payouts;
        this.payments = payments; this.bookings = bookings; this.jobs = jobs; this.users = users;
        this.notifications = notifications;
    }

    // ------------------------------------------------------------------ settings

    public PlatformSettings settings() {
        return settingsRepo.findById(1).orElseGet(() -> settingsRepo.save(new PlatformSettings()));
    }

    public PlatformSettings saveSettings(PlatformSettings s) {
        return settingsRepo.save(s);
    }

    @Transactional
    public PlatformSettings updateSettings(PlatformSettings in) {
        if (in.getCommissionRate() < 0 || in.getCommissionRate() > 50 || in.getLoyaltyRate() < 0 || in.getLoyaltyRate() > 50)
            throw CurrentUser.badRequest("Les commissions doivent être comprises entre 0 et 50 %");
        if (in.getLoyaltyRate() > in.getCommissionRate())
            throw CurrentUser.badRequest("La commission fidélité doit être inférieure ou égale à la commission normale");
        if (in.getStandardPrice() < 0 || in.getPremiumPrice() < 0 || in.getLoyaltyHours() < 0 || in.getFreeOfferLimit() < 0)
            throw CurrentUser.badRequest("Valeurs négatives interdites");
        PlatformSettings s = settings();
        s.setMonetizationEnabled(in.isMonetizationEnabled());
        s.setCommissionRate(in.getCommissionRate());
        s.setLoyaltyRate(in.getLoyaltyRate());
        s.setLoyaltyHours(in.getLoyaltyHours());
        s.setStandardPrice(in.getStandardPrice());
        s.setPremiumPrice(in.getPremiumPrice());
        s.setFreeOfferLimit(in.getFreeOfferLimit());
        s.setUpdatedAt(Instant.now());
        return settingsRepo.save(s);
    }

    // ------------------------------------------------------------------ school plans

    /** Effective plan of a school right now. During the free launch phase every school gets all features. */
    public Plan planOf(UUID schoolId) {
        PlatformSettings s = settings();
        SchoolSubscription active = subscriptions.active(schoolId, Instant.now()).stream().findFirst().orElse(null);
        if (active != null) {
            boolean premium = "PREMIUM".equals(active.getPlan());
            return new Plan(active.getPlan(), true, true, premium, null, active.getEndsAt());
        }
        if (!s.isMonetizationEnabled()) return new Plan("LAUNCH", false, true, false, null, null);
        return new Plan("FREE", false, false, false, s.getFreeOfferLimit(), null);
    }

    /** Free plan: a limited number of open offers. */
    public void checkCanOpenOffer(UUID schoolId) {
        Plan p = planOf(schoolId);
        if (p.offerLimit() == null) return;
        long open = jobs.findBySchoolIdOrderByCreatedAtDesc(schoolId).stream().filter(j -> "OPEN".equals(j.getStatus())).count();
        if (open >= p.offerLimit())
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
                    "La formule gratuite permet " + p.offerLimit() + " offre ouverte. Passez à la formule Standard pour publier sans limite.");
    }

    public boolean canReadCvs(UUID schoolId) {
        return planOf(schoolId).cvAccess();
    }

    public Set<UUID> featuredSchools() {
        return subscriptions.activePremiumSchools(Instant.now());
    }

    /** The school asks for a plan; it becomes ACTIVE when the admin records the payment. */
    @Transactional
    public SchoolSubscription request(UUID schoolId, String rawPlan, String method) {
        String plan = rawPlan == null ? "" : rawPlan.trim().toUpperCase(Locale.ROOT);
        if (!PAID_PLANS.contains(plan)) throw CurrentUser.badRequest("Formule inconnue");
        boolean pendingExists = subscriptions.findBySchoolIdOrderByCreatedAtDesc(schoolId).stream()
                .anyMatch(x -> "PENDING".equals(x.getStatus()));
        if (pendingExists) throw CurrentUser.badRequest("Une demande d'abonnement est déjà en attente de paiement");
        PlatformSettings s = settings();
        SchoolSubscription sub = new SchoolSubscription();
        sub.setSchoolId(schoolId);
        sub.setPlan(plan);
        sub.setAmount("PREMIUM".equals(plan) ? s.getPremiumPrice() : s.getStandardPrice());
        sub.setMethod(method);
        sub.setReference("ABO-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT));
        SchoolSubscription saved = subscriptions.save(sub);
        users.findByRole(Role.ADMIN).forEach(a -> notifications.notify(a.getId(), "BILLING", "Demande d'abonnement",
                "Formule " + plan + " — réf. " + saved.getReference(), "/admin"));
        return saved;
    }

    @Transactional
    public SchoolSubscription cancelRequest(UUID schoolId, UUID subscriptionId) {
        SchoolSubscription sub = subscriptions.findById(subscriptionId).orElseThrow(() -> CurrentUser.notFound("Abonnement"));
        if (!schoolId.equals(sub.getSchoolId())) throw CurrentUser.forbidden();
        if (!"PENDING".equals(sub.getStatus())) throw CurrentUser.badRequest("Seule une demande en attente peut être annulée");
        sub.setStatus("CANCELLED");
        return subscriptions.save(sub);
    }

    /** Admin: payment received → 30 days, starting after the current period if one is still running. */
    @Transactional
    public SchoolSubscription activate(UUID subscriptionId) {
        SchoolSubscription sub = subscriptions.findById(subscriptionId).orElseThrow(() -> CurrentUser.notFound("Abonnement"));
        if ("ACTIVE".equals(sub.getStatus())) return sub;
        if ("CANCELLED".equals(sub.getStatus())) throw CurrentUser.badRequest("Abonnement annulé");
        Instant now = Instant.now();
        Instant start = subscriptions.active(sub.getSchoolId(), now).stream().map(SchoolSubscription::getEndsAt)
                .max(Comparator.naturalOrder()).orElse(now);
        sub.setStatus("ACTIVE");
        sub.setStartsAt(start);
        sub.setEndsAt(start.plus(PERIOD));
        SchoolSubscription saved = subscriptions.save(sub);
        notifications.notify(sub.getSchoolId(), "BILLING", "Abonnement activé",
                "Votre formule " + sub.getPlan() + " est active jusqu'au " + saved.getEndsAt().toString().substring(0, 10) + ".", "/dashboard");
        return saved;
    }

    @Transactional
    public SchoolSubscription cancel(UUID subscriptionId) {
        SchoolSubscription sub = subscriptions.findById(subscriptionId).orElseThrow(() -> CurrentUser.notFound("Abonnement"));
        sub.setStatus("CANCELLED");
        return subscriptions.save(sub);
    }

    // ------------------------------------------------------------------ commission

    /** Hours of completed lessons given through Profa (drives the loyalty rate). */
    public double completedHours(UUID teacherId) {
        return bookings.findByTeacherIdOrderByStartsAtDesc(teacherId).stream()
                .filter(b -> "COMPLETED".equals(b.getStatus()) && b.getStartsAt() != null && b.getEndsAt() != null)
                .mapToLong(b -> Duration.between(b.getStartsAt(), b.getEndsAt()).toMinutes()).sum() / 60.0;
    }

    public int commissionRateFor(UUID teacherId) {
        PlatformSettings s = settings();
        if (!s.isMonetizationEnabled()) return 0;
        return completedHours(teacherId) >= s.getLoyaltyHours() ? s.getLoyaltyRate() : s.getCommissionRate();
    }

    /**
     * Freezes the split when a payment is confirmed. Cash is handed to the teacher directly, so no commission
     * can be collected on it: the whole amount is the teacher's and it never enters a payout.
     */
    public void applySplit(Payment p, Booking b) {
        if (p.getCommissionAmount() != null) return;
        int amount = p.getAmount() == null ? 0 : p.getAmount();
        int rate = "CASH".equals(p.getMethod()) || b == null ? 0 : commissionRateFor(b.getTeacherId());
        int commission = (int) Math.round(amount * rate / 100.0);
        p.setTeacherId(b == null ? null : b.getTeacherId());
        p.setCommissionRate(rate);
        p.setCommissionAmount(commission);
        p.setTeacherAmount(amount - commission);
        p.setConfirmedAt(Instant.now());
    }

    // ------------------------------------------------------------------ payouts

    public long pendingBalance(UUID teacherId) {
        return payments.unpaidFor(teacherId).stream().mapToLong(Payment::getTeacherAmount).sum();
    }

    /** Admin records that the teacher's pending share was sent (Orange Money, Wave, virement…). */
    @Transactional
    public Payout payout(UUID teacherId, String method, String reference) {
        List<Payment> due = payments.unpaidFor(teacherId);
        int amount = due.stream().mapToInt(Payment::getTeacherAmount).sum();
        if (amount <= 0) throw CurrentUser.badRequest("Aucun montant à verser à cet enseignant");
        Payout po = new Payout();
        po.setTeacherId(teacherId);
        po.setAmount(amount);
        po.setMethod(method);
        po.setReference(reference);
        Payout saved = payouts.save(po);
        due.forEach(p -> p.setPayoutId(saved.getId()));
        payments.saveAll(due);
        notifications.notify(teacherId, "BILLING", "Versement effectué",
                "Profa vous a versé " + amount + " FCFA" + (method == null ? "" : " par " + method) + ".", "/dashboard");
        return saved;
    }
}
