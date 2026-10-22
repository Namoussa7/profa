package com.profa.billing;

import com.profa.job.JobRepository;
import com.profa.payment.Payment;
import com.profa.payment.PaymentRepository;
import com.profa.security.CurrentUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class BillingController {

    final BillingService billing;
    final SchoolSubscriptionRepository subscriptions;
    final PayoutRepository payouts;
    final PaymentRepository payments;
    final JobRepository jobs;

    public BillingController(BillingService billing, SchoolSubscriptionRepository subscriptions, PayoutRepository payouts,
                             PaymentRepository payments, JobRepository jobs) {
        this.billing = billing; this.subscriptions = subscriptions; this.payouts = payouts; this.payments = payments; this.jobs = jobs;
    }

    public record Pricing(boolean monetizationEnabled, int commissionRate, int loyaltyRate, int loyaltyHours,
                          int standardPrice, int premiumPrice, int freeOfferLimit) {}

    public record SchoolBilling(BillingService.Plan plan, long openOffers, List<SchoolSubscription> history, Pricing pricing) {}

    public record RequestPlan(String plan, String method) {}

    public record Earnings(int commissionRate, double completedHours, int loyaltyHours, int loyaltyRate, boolean monetizationEnabled,
                           long totalEarned, long pendingBalance, List<Payment> payments, List<Payout> payouts) {}

    static Pricing pricing(PlatformSettings s) {
        return new Pricing(s.isMonetizationEnabled(), s.getCommissionRate(), s.getLoyaltyRate(), s.getLoyaltyHours(),
                s.getStandardPrice(), s.getPremiumPrice(), s.getFreeOfferLimit());
    }

    /** Public price list (pricing page). */
    @GetMapping("/public/pricing")
    public Pricing publicPricing() {
        return pricing(billing.settings());
    }

    @GetMapping("/billing/school")
    @PreAuthorize("hasRole('SCHOOL')")
    public SchoolBilling school(Authentication a) {
        UUID me = CurrentUser.id(a);
        long open = jobs.findBySchoolIdOrderByCreatedAtDesc(me).stream().filter(j -> "OPEN".equals(j.getStatus())).count();
        return new SchoolBilling(billing.planOf(me), open, subscriptions.findBySchoolIdOrderByCreatedAtDesc(me), pricing(billing.settings()));
    }

    @PostMapping("/billing/school/subscriptions")
    @PreAuthorize("hasRole('SCHOOL')")
    public SchoolSubscription request(Authentication a, @RequestBody RequestPlan in) {
        return billing.request(CurrentUser.id(a), in.plan(), in.method());
    }

    @DeleteMapping("/billing/school/subscriptions/{id}")
    @PreAuthorize("hasRole('SCHOOL')")
    public SchoolSubscription cancel(Authentication a, @PathVariable UUID id) {
        return billing.cancelRequest(CurrentUser.id(a), id);
    }

    /** Teacher: commission rate, earnings and payouts. */
    @GetMapping("/billing/teacher")
    @PreAuthorize("hasRole('TEACHER')")
    public Earnings teacher(Authentication a) {
        UUID me = CurrentUser.id(a);
        PlatformSettings s = billing.settings();
        return new Earnings(billing.commissionRateFor(me), Math.round(billing.completedHours(me) * 10) / 10.0,
                s.getLoyaltyHours(), s.getLoyaltyRate(), s.isMonetizationEnabled(),
                payments.earnedBy(me), billing.pendingBalance(me),
                payments.findTop50ByTeacherIdAndStatusOrderByCreatedAtDesc(me, "CONFIRMED"),
                payouts.findByTeacherIdOrderByCreatedAtDesc(me));
    }
}
