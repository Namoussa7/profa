package com.profa.billing;

import com.profa.admin.AuditLog;
import com.profa.admin.AuditLogRepository;
import com.profa.common.PageResponse;
import com.profa.payment.PaymentRepository;
import com.profa.school.SchoolProfile;
import com.profa.school.SchoolRepository;
import com.profa.security.CurrentUser;
import com.profa.user.UserNames;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin/billing")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBillingController {

    final BillingService billing;
    final SchoolSubscriptionRepository subscriptions;
    final PayoutRepository payouts;
    final PaymentRepository payments;
    final SchoolRepository schools;
    final AuditLogRepository audit;
    final UserNames names;

    public AdminBillingController(BillingService billing, SchoolSubscriptionRepository subscriptions, PayoutRepository payouts,
                                  PaymentRepository payments, SchoolRepository schools, AuditLogRepository audit, UserNames names) {
        this.billing = billing; this.subscriptions = subscriptions; this.payouts = payouts; this.payments = payments;
        this.schools = schools; this.audit = audit; this.names = names;
    }

    public record Overview(boolean monetizationEnabled, long commissionsThisMonth, long volumeThisMonth, long commissionsTotal,
                           long subscriptionsMonthly, Map<String, Long> activePlans, long pendingSubscriptions, long teacherBalances) {}

    public record Balance(UUID teacherId, String teacherName, long amount, long payments) {}

    public record PayoutRequest(UUID teacherId, String method, String reference) {}

    private void log(Authentication a, String action, UUID target, String details) {
        AuditLog l = new AuditLog();
        l.setAdminId(CurrentUser.id(a));
        l.setAction(action);
        l.setTargetType("BILLING");
        l.setTargetId(target);
        l.setDetails(details);
        audit.save(l);
    }

    @GetMapping("/settings")
    public PlatformSettings settings() {
        return billing.settings();
    }

    @PutMapping("/settings")
    public PlatformSettings update(Authentication a, @RequestBody PlatformSettings in) {
        PlatformSettings s = billing.updateSettings(in);
        log(a, "BILLING_SETTINGS", null, (s.isMonetizationEnabled() ? "Monétisation active" : "Phase gratuite")
                + " · commission " + s.getCommissionRate() + "% / " + s.getLoyaltyRate() + "% · Standard " + s.getStandardPrice()
                + " · Premium " + s.getPremiumPrice());
        return s;
    }

    @GetMapping("/overview")
    public Overview overview() {
        Instant monthStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Map<String, Long> plans = new LinkedHashMap<>();
        long monthly = 0;
        for (Object[] row : subscriptions.activeByPlan(Instant.now())) {
            plans.put((String) row[0], ((Number) row[1]).longValue());
            monthly += ((Number) row[2]).longValue();
        }
        long balances = payments.unpaidBalances().stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();
        return new Overview(billing.settings().isMonetizationEnabled(), payments.commissionsSince(monthStart),
                payments.volumeSince(monthStart), payments.commissionsSince(Instant.EPOCH), monthly, plans,
                subscriptions.countByStatus("PENDING"), balances);
    }

    @GetMapping("/subscriptions")
    public PageResponse<SchoolSubscription> subscriptions(@RequestParam(required = false) String status,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(required = false) Integer size) {
        var pg = PageRequest.of(Math.max(page, 0), PageResponse.size(size, 20));
        Page<SchoolSubscription> p = status == null || status.isBlank() ? subscriptions.findAllByOrderByCreatedAtDesc(pg)
                : subscriptions.findByStatusOrderByCreatedAtDesc(status.trim().toUpperCase(Locale.ROOT), pg);
        p.getContent().forEach(s -> s.setSchoolName(schools.findByUserId(s.getSchoolId()).map(SchoolProfile::getName)
                .filter(n -> n != null && !n.isBlank()).orElse(names.of(s.getSchoolId()))));
        return PageResponse.of(p);
    }

    /** action = activate (payment received) or cancel. */
    @PatchMapping("/subscriptions/{id}")
    public SchoolSubscription subscription(Authentication a, @PathVariable UUID id, @RequestParam String action) {
        SchoolSubscription s = switch (action) {
            case "activate" -> billing.activate(id);
            case "cancel" -> billing.cancel(id);
            default -> throw CurrentUser.badRequest("Action inconnue");
        };
        log(a, "activate".equals(action) ? "SUBSCRIPTION_ACTIVATE" : "SUBSCRIPTION_CANCEL", id, s.getPlan() + " — " + s.getReference());
        return s;
    }

    /** Teachers' shares waiting to be paid out (online payments only). */
    @GetMapping("/balances")
    public List<Balance> balances() {
        List<Object[]> rows = payments.unpaidBalances();
        Map<UUID, String> n = names.of(rows.stream().map(r -> (UUID) r[0]).toList());
        return rows.stream().map(r -> new Balance((UUID) r[0], n.getOrDefault((UUID) r[0], "Enseignant"),
                ((Number) r[1]).longValue(), ((Number) r[2]).longValue()))
                .sorted(Comparator.comparingLong(Balance::amount).reversed()).toList();
    }

    @PostMapping("/payouts")
    public Payout payout(Authentication a, @RequestBody PayoutRequest in) {
        if (in.teacherId() == null) throw CurrentUser.badRequest("Enseignant requis");
        Payout p = billing.payout(in.teacherId(), in.method(), in.reference());
        log(a, "PAYOUT", p.getId(), p.getAmount() + " FCFA → " + names.of(in.teacherId()) + (in.reference() == null ? "" : " (réf. " + in.reference() + ")"));
        return p;
    }

    @GetMapping("/payouts")
    public PageResponse<Payout> payouts(@RequestParam(defaultValue = "0") int page, @RequestParam(required = false) Integer size) {
        Page<Payout> p = payouts.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), PageResponse.size(size, 20)));
        Map<UUID, String> n = names.of(p.getContent().stream().map(Payout::getTeacherId).toList());
        p.getContent().forEach(x -> x.setTeacherName(n.getOrDefault(x.getTeacherId(), "Enseignant")));
        return PageResponse.of(p);
    }
}
