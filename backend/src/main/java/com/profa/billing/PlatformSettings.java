package com.profa.billing;

import jakarta.persistence.*;
import java.time.Instant;

/** Single-row table (id = 1) holding the business rules the admin can change without redeploying. */
@Entity
@Table(name = "platform_settings")
public class PlatformSettings {
    @Id Integer id = 1;
    /** false = launch phase: everything is free, no commission, no plan limits. */
    boolean monetizationEnabled;
    /** Commission in percent on lessons paid through Profa. */
    int commissionRate = 15;
    /** Reduced commission once the teacher has taught loyaltyHours through Profa. */
    int loyaltyRate = 10;
    int loyaltyHours = 100;
    /** Monthly prices in FCFA. */
    int standardPrice = 25000;
    int premiumPrice = 50000;
    /** Open offers allowed on the free plan. */
    int freeOfferLimit = 1;
    Instant updatedAt = Instant.now();

    public Integer getId(){return id;}
    public boolean isMonetizationEnabled(){return monetizationEnabled;} public void setMonetizationEnabled(boolean v){monetizationEnabled=v;}
    public int getCommissionRate(){return commissionRate;} public void setCommissionRate(int v){commissionRate=v;}
    public int getLoyaltyRate(){return loyaltyRate;} public void setLoyaltyRate(int v){loyaltyRate=v;}
    public int getLoyaltyHours(){return loyaltyHours;} public void setLoyaltyHours(int v){loyaltyHours=v;}
    public int getStandardPrice(){return standardPrice;} public void setStandardPrice(int v){standardPrice=v;}
    public int getPremiumPrice(){return premiumPrice;} public void setPremiumPrice(int v){premiumPrice=v;}
    public int getFreeOfferLimit(){return freeOfferLimit;} public void setFreeOfferLimit(int v){freeOfferLimit=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
