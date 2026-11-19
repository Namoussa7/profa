import {IconComponent} from '../core/icon.component';
import {RingComponent} from '../core/ring.component';
import {CountUpDirective} from '../core/count-up.directive';
import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {ApiService,errorMessage} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';
import {APP_STATUSES,DOC_TYPES,REQUIRED_DOCS,MODES,PAY_METHODS,STATUS,label,list,statusClass} from '../core/labels';

/** Counts per week over the last n weeks, oldest first (ahead: the last bucket is the coming week). */
function weekly(dates:(string|undefined)[],ahead=false,n=8){
 const out=new Array(n).fill(0),week=7*864e5,end=Date.now()+(ahead?week:1);
 for(const d of dates){if(!d)continue;const i=n-1-Math.floor((end-new Date(d).getTime())/week);if(i>=0&&i<n)out[i]++}
 return out;
}
/** Bar heights in % for the KPI sparkline (a floor keeps empty weeks visible). */
function bars(v:number[]){const m=Math.max(1,...v);return v.map(n=>Math.max(14,n/m*100))}

@Component({
 standalone:true,
 imports:[IconComponent,RingComponent,CountUpDirective,CommonModule,FormsModule,RouterLink],
 template:`
 <section class="dash dashboard-modern">
   <div class="hello-head">
     <div><span class="hello-chip"><i class="live"></i>Espace {{roleLabel().toLowerCase()}} · {{intro()}}</span>
       <h1 class="hello">Bon retour,<br><span class="serif">{{auth.user?.firstName}}</span></h1></div>
     <div class="dash-actions"><a class="pill" routerLink="/profil"><app-icon name="edit" [size]="16"/>Mon profil</a><a class="pill" routerLink="/messages"><app-icon name="message" [size]="16"/>Messages</a><button type="button" class="pill" (click)="auth.logout()"><app-icon name="logout" [size]="16"/>Déconnexion</button></div>
   </div>
   @if(flash){<p class="success" role="status">{{flash}}</p>}
   @if(error){<p class="error" role="alert">{{error}}</p>}

   @if(role==='TEACHER'&&docsLoaded){
   <article class="card mandatory" [class.done]="docsComplete()">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon [name]="docsComplete()?'check':'shield'" [size]="18"/></span>{{docsComplete()?'Dossier enseignant complet':'Étape obligatoire : votre dossier enseignant'}}</h3>
       <small>{{docsComplete()?'Votre CV et votre diplôme sont enregistrés. L’équipe Profa les vérifie pour vous attribuer le badge « Vérifié ».':'Envoyez votre CV et votre diplôme au format PDF (5 Mo max chacun). Sans ces deux documents, votre profil n’apparaît pas dans la recherche et vous ne pouvez ni accepter de cours ni postuler.'}}</small></div></div>
     <div class="doc-tiles">
       @for(t of REQUIRED_DOCS;track t){
         <div class="doc-tile" [class.ok]="docOk(t)" [class.ko]="docFor(t)?.status==='REJECTED'">
           <div class="doc-head"><span class="doc-ic"><app-icon name="file" [size]="22"/></span><div><strong>{{DOC_TYPES[t]}}</strong><small>PDF obligatoire</small></div>
             @if(docFor(t); as d){<span class="status" [class]="sc(d.status)">{{L(STATUS,d.status)}}</span>}@else{<span class="status ko">Manquant</span>}</div>
           @if(docFor(t); as d){
             @if(d.hasFile){<p class="doc-file"><app-icon name="file" [size]="14"/>{{d.fileName}} · {{kb(d.sizeBytes)}}</p>}
             @if(d.rejectionReason){<p class="error small">Refusé : {{d.rejectionReason}}</p>}
           }
           <div class="row-actions">
             @if(docFor(t)?.hasFile){<button class="btn small ghost" (click)="viewDoc(docFor(t))"><app-icon name="eye" [size]="16"/>Voir</button>}
             <label class="btn small file-btn" [class.ghost]="docOk(t)">{{uploading[t]?'Envoi en cours…':(docFor(t)?.hasFile?'Remplacer':'Envoyer le PDF')}}<input type="file" accept="application/pdf,.pdf" (change)="uploadDoc(t,$event)" hidden [disabled]="uploading[t]"></label>
           </div>
         </div>
       }
     </div>
   </article>
   }


   <div class="v35-grid">
     <div class="v35-main">
       <div class="kpi-row">
         @for(k of stats();track k.label){
           <div class="kpi"><div class="kpi-top"><span class="kpi-ic"><app-icon [name]="k.icon" [size]="18"/></span><small>{{k.label}}</small></div>
             <div class="kpi-num"><strong [countUp]="k.value"></strong>@if(k.spark){<span class="spark" aria-hidden="true">@for(h of k.spark;track $index){<i [style.height.%]="h"></i>}</span>}</div>
             <span class="kpi-hint">{{k.hint}}</span></div>
         }
       </div>
       <h2 class="glance">Votre progression <span class="serif">en un coup d’œil</span></h2>
       <div class="ring-row">
         @for(g of gauges();track g.label){
           <article class="ring-card">
             <div class="ring-card-head"><span class="kpi-ic"><app-icon [name]="g.icon" [size]="18"/></span><div><strong>{{g.label}}</strong><small>{{g.sub}}</small></div></div>
             <div class="ring-card-body"><app-ring [value]="g.value" [color]="g.color" [label]="g.label" [caption]="g.caption||''"/>
               <ul>@for(l of g.lines;track l[0]){<li><span>{{l[0]}}</span><b>{{l[1]}}</b></li>}</ul></div>
             @if(g.link){<a class="text-link" [routerLink]="g.link">{{g.cta}} <app-icon name="arrow" [size]="14"/></a>}
           </article>
         }
       </div>
     </div>

     <aside class="v35-side">
       <article class="monitor">
         <div class="monitor-head"><strong>{{role==='SCHOOL'?'Recrutement':'Activité'}}</strong><span class="monitor-chip">8 semaines</span></div>
         <svg class="monitor-chart" viewBox="0 0 240 80" preserveAspectRatio="none" role="img" [attr.aria-label]="'Activité des 8 dernières semaines : '+activity().join(', ')">
           <defs><linearGradient id="mon-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c8cff" stop-opacity=".45"/><stop offset="1" stop-color="#7c8cff" stop-opacity="0"/></linearGradient></defs>
           <path [attr.d]="chart().area" fill="url(#mon-area)"/><path [attr.d]="chart().line" class="monitor-line"/>
         </svg>
         <div class="monitor-next">
           @if(nextItem(); as n){<small>{{n.kicker}}</small><strong>{{n.title}}</strong><span>{{n.sub}}</span>}
           @else{<small>{{role==='SCHOOL'?'Aucune offre':'Aucun cours prévu'}}</small><span>{{role==='SCHOOL'?'Publiez une offre pour recevoir des candidatures.':'Vos prochains cours apparaîtront ici.'}}</span>}
         </div>
         <div class="monitor-kpis">@for(m of monitorKpis();track m.label){<div><small>{{m.label}}</small><strong><span [countUp]="m.value"></span>@if(m.unit){<em>{{m.unit}}</em>}</strong></div>}</div>
         <a class="monitor-cta" [routerLink]="monitorCta().link">{{monitorCta().label}}<app-icon name="arrow" [size]="15"/></a>
       </article>
       <article class="card people">
         <div class="section-row"><h3>{{peopleTitle()}}</h3><span class="live-chip"><i class="live"></i>{{people().length}}</span></div>
         @for(p of people();track p.id){
           <a class="person" [routerLink]="p.link"><span class="avatar">{{p.initials}}</span><span><b>{{p.name}}</b><small>{{p.sub}}</small></span>@if(p.tag){<em [class.ok]="p.ok">{{p.tag}}</em>}</a>
         } @empty {<p class="empty-inline">{{role==='PARENT'?'Ajoutez des enseignants en favoris avec le cœur depuis la recherche.':role==='SCHOOL'?'Aucune offre publiée.':'Vos élèves apparaîtront ici.'}}</p>}
       </article>
     </aside>
   </div>

   @if(role==='TEACHER'&&cert){
   <article class="card block cert-card" [class.done]="cert.certified">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon name="shield" [size]="18"/></span>{{cert.certified?'Vous êtes Certifié Profa':'Certification Profa'}}</h3>
       <small>@if(cert.suspended){<b class="ko-text">Profil suspendu : {{cert.suspendedReason}}</b>}@else{<span>{{certDone()}} / {{cert.steps.length}} étapes · les profils certifiés sont choisis en priorité par les parents</span>}</small></div>
       <a class="btn small" routerLink="/certification">{{cert.certified?'Voir':'Continuer'}}</a></div>
     <div class="cert-mini">@for(s of cert.steps;track s.key){<span [class.done]="s.done"><app-icon [name]="s.done?'check':'clock'" [size]="14"/>{{s.label}}</span>}</div>
   </article>
   }

   @if(role==='TEACHER'&&earnings){
   <article class="card block earnings">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon name="wallet" [size]="18"/></span>Mes revenus</h3>
       <small>@if(earnings.monetizationEnabled){<span>Commission Profa : <b>{{earnings.commissionRate}} %</b> sur les cours payés en ligne · {{earnings.loyaltyRate}} % au-delà de {{earnings.loyaltyHours}} h de cours ({{earnings.completedHours|number:'1.0-1'}} h actuellement)</span>}@else{<span>Phase de lancement : <b>aucune commission</b> sur vos cours.</span>}</small></div>
       <a class="text-link" routerLink="/tarifs">Voir les tarifs</a></div>
     <div class="earn-kpis">
       <div><small>À recevoir</small><strong>{{earnings.pendingBalance|number}} FCFA</strong><span>versé par Profa (Mobile Money)</span></div>
       <div><small>Total gagné</small><strong>{{earnings.totalEarned|number}} FCFA</strong><span>cours payés via Profa</span></div>
       <div><small>Versements reçus</small><strong>{{earnings.payouts.length}}</strong><span>@if(earnings.payouts[0]){dernier le {{earnings.payouts[0].createdAt|date:'d MMM y'}}}@else{aucun pour l’instant}</span></div>
     </div>
     <p class="muted small">Les cours réglés en espèces vous sont payés directement par le parent, sans commission.</p>
   </article>
   }

   @if(role==='SCHOOL'&&billing){
   <article class="card block plan-card" [class.paid]="billing.plan.paid">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon name="star" [size]="18"/></span>Votre formule : {{planLabel(billing.plan.code)}}</h3>
       <small>@if(billing.plan.paid){<span>Active jusqu’au <b>{{billing.plan.endsAt|date:'d MMM y'}}</b>@if(billing.plan.featured){<span> · vos offres sont « À la une »</span>}</span>}
         @else if(billing.plan.code==='LAUNCH'){<span>Phase de lancement : toutes les fonctionnalités sont <b>gratuites</b>.</span>}
         @else{<span>{{billing.openOffers}} / {{billing.plan.offerLimit}} offre(s) ouverte(s) · accès aux CV non inclus</span>}</small></div>
       <a class="text-link" routerLink="/tarifs">Comparer les formules</a></div>
     @if(pendingSub(); as p){
       <div class="result-panel wait"><app-icon name="clock" [size]="22"/><div><strong>Demande {{planLabel(p.plan)}} en attente de paiement</strong>
         <p>Envoyez <b>{{p.amount|number}} FCFA</b> en indiquant la référence <b>{{p.reference}}</b>. L’abonnement est activé dès réception par l’équipe Profa.</p>
         <button class="text-link" (click)="cancelSub(p)">Annuler la demande</button></div></div>
     } @else if(billing.pricing.monetizationEnabled){
       <div class="plan-choices">
         <button class="btn" (click)="requestPlan('STANDARD')"><app-icon name="check" [size]="16"/>Standard · {{billing.pricing.standardPrice|number}} FCFA / mois</button>
         <button class="btn accent" (click)="requestPlan('PREMIUM')"><app-icon name="star" [size]="16"/>Premium · {{billing.pricing.premiumPrice|number}} FCFA / mois</button>
       </div>
     }
   </article>
   }


   <!-- PARENT & TEACHER : réservations -->
   @if(role==='PARENT'||role==='TEACHER'){
   <article class="card block">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon name="calendar" [size]="18"/></span>Mes cours</h3><small>Réservations à venir et passées</small></div>@if(role==='PARENT'){<a class="btn small" routerLink="/enseignants">+ Réserver un cours</a>}</div>
     @for(b of bookings;track b.id){
       <div class="row-item">
         <div class="row-main"><strong>{{role==='PARENT'?b.teacherName:b.parentName}}</strong><small>{{b.startsAt | date:'EEE d MMM y, HH:mm'}} – {{b.endsAt | date:'HH:mm'}} · {{L(MODES,b.mode)}}@if(b.address){ · {{b.address}}}</small></div>
         <div class="row-tags"><span class="status" [class]="sc(b.status)">{{L(STATUS,b.status)}}</span><span class="status" [class]="sc(b.paymentStatus)">{{L(STATUS,b.paymentStatus)}}</span><b>{{b.amount||0 | number}} FCFA</b></div>
         <div class="row-actions">
           @if(role==='PARENT'){
             @if(b.paymentStatus!=='PAID'&&b.status!=='CANCELLED'){<button class="btn small" (click)="payFor=b.id;payMethod='ORANGE_MONEY'">Payer</button>}
             @if(b.status==='COMPLETED'&&!b.reviewed){<button class="btn small gold" (click)="reviewFor=b.id;review={rating:5,comment:''}"><app-icon name="star" [size]="16"/>Laisser un avis</button>}
           } @else {
             @if(b.status==='PENDING_PAYMENT'){<button class="btn small" (click)="bookingStatus(b,'CONFIRMED')">Confirmer</button>}
             @if(b.status==='CONFIRMED'){<button class="btn small" (click)="bookingStatus(b,'COMPLETED')">Cours terminé</button>}
           }
           @if(b.status!=='COMPLETED'&&b.status!=='CANCELLED'){<button class="btn small danger" (click)="bookingStatus(b,'CANCELLED')">Annuler</button>}
           <button class="btn small ghost" (click)="message(role==='PARENT'?b.teacherId:b.parentId)" aria-label="Envoyer un message"><app-icon name="message" [size]="16"/></button>
         </div>
         @if(payFor===b.id){
           <form class="inline-form" (ngSubmit)="pay(b)">
             <label>Moyen de paiement<select name="method" [(ngModel)]="payMethod">@for(m of payKeys;track m){<option [value]="m">{{PAY_METHODS[m]}}</option>}</select></label>
             <button class="btn small">Payer {{b.amount||0 | number}} FCFA</button><button type="button" class="text-link" (click)="payFor=null">Annuler</button>
           </form>
         }
         @if(reviewFor===b.id){
           <form class="inline-form" (ngSubmit)="sendReview(b)">
             <div class="star-input" role="radiogroup" aria-label="Note">@for(n of [1,2,3,4,5];track n){<button type="button" role="radio" [attr.aria-checked]="review.rating===n" [class.on]="n<=review.rating" (click)="review.rating=n">★</button>}</div>
             <textarea name="comment" rows="2" [(ngModel)]="review.comment" placeholder="Votre expérience avec cet enseignant…"></textarea>
             <button class="btn small">Publier l’avis</button><button type="button" class="text-link" (click)="reviewFor=null">Annuler</button>
           </form>
         }
       </div>
     } @empty {<p class="empty-inline">Aucun cours pour le moment.@if(role==='PARENT'){ <a class="text-link" routerLink="/enseignants">Trouver un enseignant <app-icon name="arrow" [size]="14"/></a>}</p>}
   </article>

   <article class="card block">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon name="send" [size]="18"/></span>Demandes de cours</h3><small>{{role==='PARENT'?'Vos demandes envoyées':'Demandes reçues et demandes ouvertes'}}</small></div></div>
     @for(r of requests;track r.id){
       <div class="row-item">
         <div class="row-main"><strong>{{r.subject}}@if(r.level){ · {{r.level}}}</strong><small>{{role==='PARENT'?(r.teacherName||'Demande ouverte'):r.parentName}} · {{r.createdAt | date:'d MMM'}}@if(r.budget){ · budget {{r.budget | number}} FCFA/h}</small>@if(r.notes){<small class="note">« {{r.notes}} »</small>}</div>
         <div class="row-tags"><span class="status" [class]="sc(r.status)">{{L(STATUS,r.status)}}</span></div>
         <div class="row-actions">
           @if(role==='TEACHER'&&r.status==='PENDING'){<button class="btn small" (click)="requestStatus(r,'ACCEPTED')">Accepter</button><button class="btn small danger" (click)="requestStatus(r,'DECLINED')">Refuser</button>}
           @if(role==='PARENT'&&r.status==='PENDING'){<button class="btn small danger" (click)="requestStatus(r,'CANCELLED')">Annuler</button>}
           @if(role==='PARENT'&&r.status==='ACCEPTED'&&r.teacherId){<a class="btn small" [routerLink]="['/enseignants',r.teacherId]">Réserver un créneau</a>}
           @if(role==='TEACHER'){<button class="btn small ghost" (click)="message(r.parentId)" aria-label="Envoyer un message"><app-icon name="message" [size]="16"/></button>}
         </div>
       </div>
     } @empty {<p class="empty-inline">Aucune demande.</p>}
   </article>
   }


   @if(role==='TEACHER'){
   <div class="modern-dash-grid">
     <article class="card block">
       <div class="section-row"><div><h3><span class="h-ic"><app-icon name="file" [size]="18"/></span>Tous mes documents</h3><small>Pièces complémentaires (facultatives) : identité, attestations…</small></div></div>
       @for(d of documents;track d.id){
         <div class="row-item compact"><div class="row-main"><strong>{{L(DOC_TYPES,d.type)}}</strong><small>@if(d.hasFile){<span>{{d.fileName}} · {{kb(d.sizeBytes)}}</span>}@else{<span>Ancien lien : à renvoyer en PDF</span>}@if(d.rejectionReason){<span> · Motif : {{d.rejectionReason}}</span>}</small></div><span class="status" [class]="sc(d.status)">{{L(STATUS,d.status)}}</span><div class="row-actions">@if(d.hasFile){<button class="btn small ghost" (click)="viewDoc(d)" aria-label="Voir le PDF"><app-icon name="eye" [size]="16"/></button>}@if(d.status!=='APPROVED'){<button class="btn small ghost" (click)="deleteDoc(d)" aria-label="Supprimer"><app-icon name="trash" [size]="16"/></button>}</div></div>
       } @empty {<p class="empty-inline">Aucun document envoyé.</p>}
       <div class="inline-form">
         <select name="type" [(ngModel)]="doc.type" aria-label="Type de document">@for(k of optionalDocKeys;track k){<option [value]="k">{{DOC_TYPES[k]}}</option>}</select>
         <label class="btn small file-btn">{{uploading[doc.type]?'Envoi…':'Choisir un PDF'}}<input type="file" accept="application/pdf,.pdf" (change)="uploadDoc(doc.type,$event)" hidden></label>
       </div>
     </article>
     <article class="card block">
       <div class="section-row"><div><h3><span class="h-ic"><app-icon name="briefcase" [size]="18"/></span>Mes candidatures</h3><small>Suivi de vos candidatures aux offres des écoles</small></div><a class="btn small ghost" routerLink="/emplois">Voir les offres</a></div>
       @for(a of applications;track a.id){
         <div class="row-item compact"><div class="row-main"><strong>{{a.jobTitle}}</strong><small>Envoyée le {{a.createdAt | date:'d MMM y'}}</small></div><span class="status" [class]="sc(a.status)">{{L(STATUS,a.status)}}</span></div>
       } @empty {<p class="empty-inline">Aucune candidature.</p>}
     </article>
   </div>
   }

   @if(role==='SCHOOL'){
   <article class="card block">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon name="briefcase" [size]="18"/></span>Mes offres d’emploi</h3><small>Publiez, fermez et suivez vos recrutements</small></div><a class="btn small" routerLink="/emplois">+ Publier une offre</a></div>
     @for(j of jobs;track j.id){
       <div class="row-item">
         <div class="row-main"><strong>{{j.title}}</strong><small>{{j.subject||'—'}} · {{j.city||'Mali'}} · publiée le {{j.createdAt | date:'d MMM y'}}</small></div>
         <div class="row-tags"><span class="status" [class]="sc(j.status)">{{L(STATUS,j.status)}}</span><b>{{j.applicationsCount||0}} candidature(s)</b></div>
         <div class="row-actions"><button class="btn small" (click)="toggleApplicants(j)">{{openJob===j.id?'Masquer':'Candidatures'}}</button><button class="btn small ghost" (click)="jobStatus(j)">{{j.status==='OPEN'?'Fermer':'Rouvrir'}}</button></div>
         @if(openJob===j.id){
           <div class="applicants">
             @for(a of applicants;track a.id){
               <div class="row-item compact">
                 <div class="row-main"><strong>{{a.teacherName}}</strong><small>{{a.createdAt | date:'d MMM y'}}</small>@if(a.coverLetter){<small class="note">« {{a.coverLetter}} »</small>}</div>
                 <select [ngModel]="a.status" (ngModelChange)="applicationStatus(a,$event)" aria-label="Statut de la candidature">@for(s of APP_STATUSES;track s){<option [value]="s">{{L(STATUS,s)}}</option>}</select>
                 <div class="row-actions"><button class="btn small" (click)="viewCv(a.teacherId)"><app-icon name="file" [size]="16"/>CV</button>@if(a.teacherProfileId){<a class="btn small ghost" [routerLink]="['/enseignants',a.teacherProfileId]">Profil</a>}<button class="btn small ghost" (click)="message(a.teacherId)" aria-label="Envoyer un message"><app-icon name="message" [size]="16"/></button></div>
               </div>
             } @empty {<p class="empty-inline">Pas encore de candidature.</p>}
           </div>
         }
       </div>
     } @empty {<p class="empty-inline">Aucune offre publiée. <a class="text-link" routerLink="/emplois">Publier votre première offre <app-icon name="arrow" [size]="14"/></a></p>}
   </article>
   }
 </section>`
})
export class DashboardComponent implements OnInit{
 auth=inject(AuthService);api=inject(ApiService);router=inject(Router);
 STATUS=STATUS;MODES=MODES;PAY_METHODS=PAY_METHODS;DOC_TYPES=DOC_TYPES;APP_STATUSES=APP_STATUSES;L=label;sc=statusClass;
 payKeys=Object.keys(PAY_METHODS);optionalDocKeys=Object.keys(DOC_TYPES).filter(k=>!REQUIRED_DOCS.includes(k));REQUIRED_DOCS=REQUIRED_DOCS;
 role=this.auth.role();
 bookings:any[]=[];requests:any[]=[];favorites:any[]=[];documents:any[]=[];applications:any[]=[];jobs:any[]=[];applicants:any[]=[];
 profile:any=null;completion=0;unreadMessages=0;flash='';error='';
 payFor:string|null=null;payMethod='ORANGE_MONEY';reviewFor:string|null=null;review:any={rating:5,comment:''};
 doc:any={type:'ID_CARD'};uploading:{[k:string]:boolean}={};docsLoaded=false;openJob:string|null=null;

 ngOnInit(){
  if(this.role==='ADMIN'){this.router.navigateByUrl('/admin');return}
  this.load();
 }
 roleLabel(){return ({TEACHER:'ENSEIGNANT',SCHOOL:'ÉCOLE',PARENT:'PARENT / ÉLÈVE',ADMIN:'ADMIN'} as any)[this.role||'']||''}
 intro(){return this.role==='TEACHER'?'vos cours et votre vérification':this.role==='SCHOOL'?'vos offres et vos candidatures':'vos cours et vos paiements'}
 private ok(msg:string){this.flash=msg;this.error='';setTimeout(()=>this.flash='',4000)}
 private ko(e:any){this.error=errorMessage(e);this.flash=''}

 load(){
  this.api.get<any>('/api/v1/messaging/unread-count').subscribe({next:x=>this.unreadMessages=x.count,error:()=>{}});
  if(this.role==='PARENT'||this.role==='TEACHER'){
   this.api.get<any[]>('/api/v1/bookings').subscribe({next:x=>this.bookings=x,error:e=>this.ko(e)});
   this.api.get<any[]>('/api/v1/course-requests').subscribe({next:x=>this.requests=x,error:e=>this.ko(e)});
  }
  if(this.role==='PARENT'){
   this.api.get<string[]>('/api/v1/favorites').subscribe({next:ids=>{this.favorites=[];ids.forEach(id=>this.api.get<any>(`/api/v1/teachers/${id}`).subscribe({next:t=>this.favorites=[...this.favorites,t],error:()=>{}}))},error:()=>{}});
  }
  if(this.role==='TEACHER'){
   this.api.get<any>('/api/v1/certification/status').subscribe({next:x=>this.cert=x,error:()=>{}});
   this.api.get<any>('/api/v1/billing/teacher').subscribe({next:x=>this.earnings=x,error:()=>{}});
   this.api.get<any>('/api/v1/teachers/me').subscribe({next:p=>{this.profile=p;this.computeCompletion()},error:()=>{}});
   this.api.get<any[]>('/api/v1/documents/mine').subscribe({next:x=>{this.documents=x;this.docsLoaded=true;this.computeCompletion()},error:()=>{this.docsLoaded=true}});
   this.api.get<any[]>('/api/v1/jobs/applications/mine').subscribe({next:x=>this.applications=x,error:()=>{}});
  }
  if(this.role==='SCHOOL'){
   this.api.get<any>('/api/v1/schools/me').subscribe({next:p=>{this.profile=p;this.computeCompletion()},error:()=>{}});
   this.loadBilling();
   this.api.get<any[]>('/api/v1/jobs/mine').subscribe({next:x=>this.jobs=x,error:e=>this.ko(e)});
  }
 }
 earnings:any=null;billing:any=null;cert:any=null;
 certDone(){return (this.cert?.steps||[]).filter((s:any)=>s.done).length}
 loadBilling(){this.api.get<any>('/api/v1/billing/school').subscribe({next:x=>this.billing=x,error:()=>{}})}
 planLabel(c:string){return ({LAUNCH:'Lancement (gratuit)',FREE:'Gratuite',STANDARD:'Standard',PREMIUM:'Premium'} as any)[c]||c}
 pendingSub(){return this.billing?.history?.find((h:any)=>h.status==='PENDING')}
 requestPlan(plan:string){
  if(!confirm(`Demander la formule ${this.planLabel(plan)} ? Vous recevrez une référence de paiement.`))return;
  this.api.post<any>('/api/v1/billing/school/subscriptions',{plan,method:'ORANGE_MONEY'}).subscribe({next:()=>{this.ok('Demande enregistrée : effectuez le paiement avec la référence indiquée.');this.loadBilling()},error:e=>this.ko(e)});
 }
 cancelSub(p:any){this.api.delete(`/api/v1/billing/school/subscriptions/${p.id}`).subscribe({next:()=>this.loadBilling(),error:e=>this.ko(e)})}
 computeCompletion(){
  const p=this.profile||{};
  const checks=this.role==='TEACHER'
   ?[p.headline,p.bio,list(p.subjects).length,list(p.levels).length,list(p.teachingModes).length,p.hourlyRate,p.city,p.availabilityJson,p.avatarUrl,this.docsComplete()]
   :[p.name,p.city,p.address,p.description,p.phone,p.logoUrl,p.website];
  this.completion=Math.round(checks.filter(Boolean).length/checks.length*100);
 }
 stats():{icon:string;label:string;value:number;hint:string;spark?:number[]}[]{
  const upcoming=this.bookings.filter(b=>['PENDING_PAYMENT','CONFIRMED'].includes(b.status)).length;
  const pendingReq=this.requests.filter(r=>r.status==='PENDING').length;
  const bookSpark=bars(weekly(this.bookings.map(b=>b.startsAt),true)),reqSpark=bars(weekly(this.requests.map(r=>r.createdAt)));
  if(this.role==='PARENT')return[
   {icon:'calendar',label:'Cours à venir',value:upcoming,hint:'Réservations actives',spark:bookSpark},
   {icon:'wallet',label:'À payer',value:this.bookings.filter(b=>b.paymentStatus!=='PAID'&&b.status!=='CANCELLED').length,hint:'Paiements en attente'},
   {icon:'message',label:'Messages',value:this.unreadMessages,hint:'Non lu(s)'}];
  if(this.role==='TEACHER')return[
   {icon:'send',label:'Demandes',value:pendingReq,hint:'En attente de réponse',spark:reqSpark},
   {icon:'calendar',label:'Cours à venir',value:upcoming,hint:'Réservations actives',spark:bookSpark},
   {icon:'message',label:'Messages',value:this.unreadMessages,hint:'Non lu(s)'}];
  return[
   {icon:'briefcase',label:'Offres ouvertes',value:this.jobs.filter(j=>j.status==='OPEN').length,hint:'Visibles des enseignants',spark:bars(weekly(this.jobs.map(j=>j.createdAt)))},
   {icon:'file',label:'Candidatures',value:this.jobs.reduce((s,j)=>s+(j.applicationsCount||0),0),hint:'Toutes offres'},
   {icon:'message',label:'Messages',value:this.unreadMessages,hint:'Non lu(s)'}];
 }
 /** "At a glance" gauges, per role. */
 gauges():{icon:string;label:string;sub:string;value:number;color:string;lines:[string,string][];caption?:string;link?:string;cta?:string}[]{
  const live=this.bookings.filter(b=>b.status!=='CANCELLED');
  const done=live.filter(b=>b.status==='COMPLETED').length,upcoming=live.length-done;
  const pct=(a:number,b:number)=>b?a/b*100:0;
  if(this.role==='TEACHER'){
   const steps=this.cert?.steps?.length||0;
   return[
    {icon:'user',label:'Profil',sub:'Fiche publique',value:this.completion,color:'#3b5bfd',lines:[['Dossier PDF',this.docsComplete()?'Complet':'Incomplet'],['Tarif',(this.profile?.hourlyRate||0).toLocaleString('fr-FR')+' F/h']],link:this.completion<100?'/profil':undefined,cta:'Compléter'},
    {icon:'shield',label:'Certification',sub:'Badge Certifié Profa',value:pct(this.certDone(),steps),color:'#f5a524',lines:[['Étapes',this.certDone()+' / '+steps],['Statut',this.cert?.certified?'Certifié':this.cert?.suspended?'Suspendu':'En cours']],link:'/certification',cta:this.cert?.certified?'Voir':'Continuer'},
    {icon:'calendar',label:'Cours',sub:'Taux de cours terminés',value:pct(done,live.length),color:'#12b886',lines:[['Terminés',String(done)],['À venir',String(upcoming)]]}];
  }
  if(this.role==='PARENT'){
   const paid=live.filter(b=>b.paymentStatus==='PAID').length;
   const acc=this.requests.filter(r=>r.status==='ACCEPTED').length,wait=this.requests.filter(r=>r.status==='PENDING').length;
   return[
    {icon:'calendar',label:'Cours',sub:'Taux de cours terminés',value:pct(done,live.length),color:'#3b5bfd',lines:[['Terminés',String(done)],['À venir',String(upcoming)]],link:'/enseignants',cta:'Réserver un cours'},
    {icon:'wallet',label:'Paiements',sub:'Cours réglés',value:pct(paid,live.length),color:'#f5a524',lines:[['Payés',String(paid)],['À payer',String(live.length-paid)]]},
    {icon:'send',label:'Demandes',sub:'Acceptées par un enseignant',value:pct(acc,this.requests.length),color:'#12b886',lines:[['Acceptées',String(acc)],['En attente',String(wait)]]}];
  }
  const open=this.jobs.filter(j=>j.status==='OPEN').length,limit=this.billing?.plan?.offerLimit;
  return[
   {icon:'school',label:'Profil école',sub:'Fiche publique',value:this.completion,color:'#3b5bfd',lines:[['Ville',this.profile?.city||'—'],['Site web',this.profile?.website?'Oui':'Non']],link:this.completion<100?'/profil':undefined,cta:'Compléter'},
   {icon:'briefcase',label:'Offres',sub:'Offres ouvertes',value:pct(open,this.jobs.length),color:'#f5a524',lines:[['Ouvertes',String(open)],['Fermées',String(this.jobs.length-open)]],link:'/emplois',cta:'Publier une offre'},
   {icon:'star',label:'Formule',sub:this.billing?this.planLabel(this.billing.plan.code):'—',value:limit?pct(this.billing.openOffers,limit):100,caption:limit?'utilisé':'illimité',color:'#12b886',lines:[['Offres',(this.billing?.openOffers??open)+' / '+(limit||'∞')],['Accès CV',this.billing?.plan?.cvAccess?'Inclus':'Non']],link:'/tarifs',cta:'Comparer'}];
 }
 /** Weekly activity for the dark side card. */
 activity(){return this.role==='SCHOOL'?weekly(this.jobs.map(j=>j.createdAt)):weekly(this.bookings.map(b=>b.startsAt),true)}
 chart(){
  const v=this.activity(),max=Math.max(1,...v),pts=v.map((n,i)=>[i*240/(v.length-1),72-n/max*60]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  return {line,area:line+' L240 80 L0 80 Z'};
 }
 nextItem(){
  if(this.role==='SCHOOL'){
   const j=[...this.jobs].sort((a,b)=>(b.applicationsCount||0)-(a.applicationsCount||0))[0];
   return j?{kicker:'Offre la plus suivie',title:j.title,sub:(j.applicationsCount||0)+' candidature(s) · '+(j.city||'Mali')}:null;
  }
  const now=Date.now(),b=this.bookings.filter(x=>['PENDING_PAYMENT','CONFIRMED'].includes(x.status)&&new Date(x.startsAt).getTime()>now)
   .sort((a,c)=>new Date(a.startsAt).getTime()-new Date(c.startsAt).getTime())[0];
  return b?{kicker:'Prochain cours',title:this.role==='PARENT'?b.teacherName:b.parentName,
   sub:new Date(b.startsAt).toLocaleString('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' · '+label(MODES,b.mode)}:null;
 }
 monitorKpis():{label:string;value:number;unit?:string}[]{
  if(this.role==='TEACHER')return[{label:'À recevoir',value:this.earnings?.pendingBalance||0,unit:'F'},{label:'Total gagné',value:this.earnings?.totalEarned||0,unit:'F'}];
  if(this.role==='PARENT')return[{label:'Payé',value:this.bookings.filter(b=>b.paymentStatus==='PAID').reduce((s,b)=>s+(b.amount||0),0),unit:'F'},{label:'Favoris',value:this.favorites.length}];
  return[{label:'Candidatures',value:this.jobs.reduce((s,j)=>s+(j.applicationsCount||0),0)},{label:'Offres',value:this.jobs.length}];
 }
 monitorCta(){return this.role==='PARENT'?{link:'/enseignants',label:'Réserver un cours'}:this.role==='SCHOOL'?{link:'/emplois',label:'Publier une offre'}:{link:'/messages',label:'Ouvrir la messagerie'}}
 peopleTitle(){return this.role==='PARENT'?'Mes enseignants':this.role==='SCHOOL'?'Offres récentes':'Mes élèves'}
 /** Side list: favourite teachers (parent), students (teacher) or latest offers (school). */
 people():{id:string;name:string;sub:string;initials:string;link:any;tag?:string;ok?:boolean}[]{
  const ini=(n:string)=>(n||'?').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  if(this.role==='PARENT')return this.favorites.slice(0,5).map(t=>({id:t.id,name:t.firstName+' '+t.lastName,sub:t.headline||'Enseignant',initials:ini(t.firstName+' '+t.lastName),link:['/enseignants',t.id],tag:t.certified?'Certifié':t.verified?'Vérifié':'',ok:true}));
  if(this.role==='SCHOOL')return this.jobs.slice(0,5).map(j=>({id:j.id,name:j.title,sub:(j.applicationsCount||0)+' candidature(s)',initials:ini(j.subject||j.title),link:'/emplois',tag:j.status==='OPEN'?'Ouverte':'Fermée',ok:j.status==='OPEN'}));
  const seen=new Map<string,any>();
  for(const b of this.bookings){if(!b.parentId)continue;const e=seen.get(b.parentId)||{id:b.parentId,name:b.parentName,n:0};e.n++;seen.set(b.parentId,e)}
  return [...seen.values()].slice(0,5).map(e=>({id:e.id,name:e.name,sub:e.n+' cours',initials:ini(e.name),link:'/messages',tag:'Élève',ok:true}));
 }
 bookingStatus(b:any,value:string){
  if(value==='CANCELLED'&&!confirm('Annuler cette réservation ?'))return;
  this.api.patch(`/api/v1/bookings/${b.id}/status`,{},{value}).subscribe({next:()=>{this.ok('Réservation mise à jour.');this.load()},error:e=>this.ko(e)});
 }
 requestStatus(r:any,value:string){this.api.patch(`/api/v1/course-requests/${r.id}/status`,{},{value}).subscribe({next:()=>{this.ok('Demande mise à jour.');this.load()},error:e=>this.ko(e)})}
 pay(b:any){
  this.api.post<any>('/api/v1/payments',{bookingId:b.id,method:this.payMethod}).subscribe({
   next:p=>{this.payFor=null;this.ok(this.payMethod==='CASH'?`Paiement en espèces enregistré (réf. ${p.externalReference}). Réglez l’enseignant au début du cours.`:`Paiement initié (réf. ${p.externalReference}). Il sera confirmé dès réception par ${PAY_METHODS[this.payMethod]}.`);this.load()},
   error:e=>this.ko(e)});
 }
 sendReview(b:any){this.api.post('/api/v1/reviews',{bookingId:b.id,...this.review}).subscribe({next:()=>{this.reviewFor=null;this.ok('Merci pour votre avis !');this.load()},error:e=>this.ko(e)})}
 message(userId:string){this.api.post<any>('/api/v1/messaging/conversations',{userId}).subscribe({next:c=>this.router.navigate(['/messages',c.id]),error:e=>this.ko(e)})}
 docFor(t:string){return this.documents.find(d=>d.type===t)}
 docOk(t:string){const d=this.docFor(t);return !!d&&d.hasFile&&d.status!=='REJECTED'}
 docsComplete(){return REQUIRED_DOCS.every(t=>this.docOk(t))}
 kb(n:number){return n>=1048576?(n/1048576).toFixed(1)+' Mo':Math.max(1,Math.round((n||0)/1024))+' Ko'}
 viewDoc(d:any){if(d)this.api.openPdf(`/api/v1/documents/${d.id}/file`)}
 /** Client-side checks first (type, 5 MB), then multipart upload. */
 uploadDoc(type:string,ev:Event){
  const input=ev.target as HTMLInputElement;const file=input.files?.[0];input.value='';
  if(!file)return;
  if(!(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))){this.error='Seuls les fichiers PDF sont acceptés.';return}
  if(file.size>5*1024*1024){this.error='Le fichier dépasse 5 Mo. Compressez-le puis réessayez.';return}
  const form=new FormData();form.append('type',type);form.append('file',file,file.name);
  this.uploading={...this.uploading,[type]:true};this.error='';
  this.api.upload<any>('/api/v1/documents',form).subscribe({
   next:d=>{this.uploading={...this.uploading,[type]:false};this.documents=[d,...this.documents.filter(x=>x.id!==d.id)];this.computeCompletion();this.ok(DOC_TYPES[type]+' envoyé. Il sera vérifié par l’équipe Profa.')},
   error:e=>{this.uploading={...this.uploading,[type]:false};this.ko(e)}});
 }
 viewCv(teacherId:string){
  this.api.get<any[]>(`/api/v1/documents/teacher/${teacherId}`).subscribe({
   next:list=>{const cv=list.find(d=>d.type==='CV'&&d.hasFile);if(cv)this.api.openPdf(`/api/v1/documents/${cv.id}/file`);else this.error='Ce candidat n’a pas encore de CV en PDF.'},
   error:e=>this.ko(e)});
 }
 deleteDoc(d:any){if(!confirm('Supprimer ce document ?'))return;this.api.delete(`/api/v1/documents/${d.id}`).subscribe({next:()=>this.load(),error:e=>this.ko(e)})}
 jobStatus(j:any){this.api.patch(`/api/v1/jobs/${j.id}/status`,{},{value:j.status==='OPEN'?'CLOSED':'OPEN'}).subscribe({next:()=>this.load(),error:e=>this.ko(e)})}
 toggleApplicants(j:any){
  if(this.openJob===j.id){this.openJob=null;return}
  this.openJob=j.id;this.applicants=[];
  this.api.get<any[]>(`/api/v1/jobs/${j.id}/applications`).subscribe({next:x=>this.applicants=x,error:e=>this.ko(e)});
 }
 applicationStatus(a:any,status:string){this.api.patch(`/api/v1/jobs/applications/${a.id}`,{},{status}).subscribe({next:()=>{a.status=status;this.ok('Candidature mise à jour, le candidat est notifié.')},error:e=>this.ko(e)})}
}
