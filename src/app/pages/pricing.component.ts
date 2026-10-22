import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterLink} from '@angular/router';
import {ApiService} from '../core/api.service';
import {IconComponent} from '../core/icon.component';

@Component({
 standalone:true,
 imports:[CommonModule,RouterLink,IconComponent],
 template:`
 <section class="page">
   <div class="page-hero"><div><div class="eyebrow">Tarifs</div><h1>Des prix simples et transparents</h1>
     <p>L’inscription est gratuite pour tous. Les parents paient uniquement le prix du cours fixé par l’enseignant.</p></div></div>
   @if(p && !p.monetizationEnabled){<p class="notice"><app-icon name="gift" [size]="18"/> Phase de lancement : <b>toutes les fonctionnalités sont gratuites</b> pour le moment, sans commission ni abonnement.</p>}

   <h2 class="pricing-title">Écoles et établissements</h2>
   <div class="pricing-grid">
     <article class="card plan">
       <h3>Gratuite</h3><div class="plan-price">0 <small>FCFA</small></div>
       <ul><li><app-icon name="check" [size]="16"/>{{p?.freeOfferLimit||1}} offre d’emploi ouverte</li><li><app-icon name="check" [size]="16"/>Réception des candidatures</li><li><app-icon name="check" [size]="16"/>Messagerie avec les candidats</li><li class="no"><app-icon name="x" [size]="16"/>Accès aux CV</li></ul>
       <a class="btn ghost full" routerLink="/inscription" [queryParams]="{role:'SCHOOL'}">Créer un compte école</a>
     </article>
     <article class="card plan highlight">
       <span class="plan-badge">Le plus choisi</span>
       <h3>Standard</h3><div class="plan-price">{{(p?.standardPrice||25000)|number}} <small>FCFA / mois</small></div>
       <ul><li><app-icon name="check" [size]="16"/>Offres illimitées</li><li><app-icon name="check" [size]="16"/>Accès aux CV et diplômes des candidats</li><li><app-icon name="check" [size]="16"/>Suivi des candidatures (présélection, entretien…)</li><li><app-icon name="check" [size]="16"/>Messagerie</li></ul>
       <a class="btn full" routerLink="/dashboard">Choisir Standard</a>
     </article>
     <article class="card plan">
       <h3>Premium</h3><div class="plan-price">{{(p?.premiumPrice||50000)|number}} <small>FCFA / mois</small></div>
       <ul><li><app-icon name="check" [size]="16"/>Tout Standard</li><li><app-icon name="check" [size]="16"/>Offres « À la une », affichées en premier</li><li><app-icon name="check" [size]="16"/>Mise en avant auprès des enseignants</li><li><app-icon name="check" [size]="16"/>Accompagnement au recrutement</li></ul>
       <a class="btn accent full" routerLink="/dashboard">Choisir Premium</a>
     </article>
   </div>

   <h2 class="pricing-title">Enseignants</h2>
   <div class="pricing-grid two-cols">
     <article class="card plan">
       <h3>Inscription et profil</h3><div class="plan-price">Gratuit</div>
       <ul><li><app-icon name="check" [size]="16"/>Profil public, vérification des documents</li><li><app-icon name="check" [size]="16"/>Demandes et réservations illimitées</li><li><app-icon name="check" [size]="16"/>Candidatures aux offres des écoles</li></ul>
     </article>
     <article class="card plan">
       <h3>Commission sur les cours payés via Profa</h3>
       <div class="plan-price">{{p?.commissionRate??15}} % <small>puis {{p?.loyaltyRate??10}} % après {{p?.loyaltyHours??100}} h de cours</small></div>
       <ul><li><app-icon name="check" [size]="16"/>Exemple : cours à 5 000 FCFA → {{5000*(100-(p?.commissionRate??15))/100|number}} FCFA pour vous</li><li><app-icon name="check" [size]="16"/>Paiement garanti et versé en Mobile Money</li><li><app-icon name="check" [size]="16"/>Avis vérifiés et meilleure visibilité</li><li><app-icon name="check" [size]="16"/>Aucune commission sur les cours payés en espèces</li></ul>
     </article>
   </div>

   <article class="card faq"><h2>Questions fréquentes</h2>
     <details><summary>Les parents paient-ils des frais ?</summary><p>Non. Le parent paie le prix affiché par l’enseignant, rien de plus.</p></details>
     <details><summary>Comment payer un abonnement école ?</summary><p>Choisissez la formule depuis votre espace : une référence de paiement est générée. Envoyez le montant en Orange Money, Moov Money ou Wave avec cette référence ; l’abonnement est activé pour 30 jours dès réception.</p></details>
     <details><summary>Quand l’enseignant est-il payé ?</summary><p>Après le cours, la part de l’enseignant (montant moins la commission) est versée par Profa en Mobile Money.</p></details>
   </article>
 </section>`
})
export class PricingComponent implements OnInit{
 api=inject(ApiService);p:any=null;
 ngOnInit(){this.api.get<any>('/api/v1/public/pricing').subscribe({next:x=>this.p=x,error:()=>{}})}
}
