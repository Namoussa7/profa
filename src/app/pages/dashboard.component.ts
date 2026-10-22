import {IconComponent} from '../core/icon.component';
import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {ApiService,errorMessage} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';
import {APP_STATUSES,DOC_TYPES,REQUIRED_DOCS,MODES,PAY_METHODS,STATUS,label,list,statusClass} from '../core/labels';

@Component({
 standalone:true,
 imports:[IconComponent,CommonModule,FormsModule,RouterLink],
 template:`
 <section class="dash dashboard-modern">
   <div class="dash-welcome"><div><div class="eyebrow">VOTRE ESPACE · {{roleLabel()}}</div><h1>Bonjour, {{auth.user?.firstName}}</h1><p>{{intro()}}</p></div>
     <div class="dash-actions"><a class="btn ghost" routerLink="/profil"><app-icon name="edit" [size]="18"/>Mon profil</a>@if(role==='ADMIN'){<a class="btn" routerLink="/admin">Administration</a>}<button class="btn ghost" (click)="auth.logout()">Déconnexion</button></div></div>
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

   @if(role==='TEACHER'||role==='SCHOOL'){
   <div class="welcome-strip"><div><span><app-icon name="sparkle" [size]="22"/></span><div><strong>{{completion<100?'Complétez votre profil':'Profil complet'}}</strong><p>{{completion<100?'Un profil complet apparaît plus haut dans les résultats et inspire confiance.':'Votre profil est prêt à recevoir des '+(role==='TEACHER'?'élèves.':'candidatures.')}}</p></div></div>
     <div class="profile-progress"><strong>{{completion}}%</strong><div><div class="progress"><span [style.width.%]="completion"></span></div><small>Profil complété</small></div>@if(completion<100){<a class="btn small" routerLink="/profil">Compléter</a>}</div></div>
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

   <div class="stats modern-stats">
     @for(s of stats();track s.label){<div><span class="stat-icon"><app-icon [name]="s.icon" [size]="22"/></span><small>{{s.label}}</small><strong>{{s.value}}</strong><span>{{s.hint}}</span></div>}
   </div>

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

   @if(role==='PARENT'){
   <article class="card block">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon name="heart" [size]="18"/></span>Enseignants favoris</h3><small>Retrouvez vos profils sauvegardés</small></div></div>
     <div class="fav-row">@for(t of favorites;track t.id){<a class="fav-card" [routerLink]="['/enseignants',t.id]"><strong>{{t.firstName}} {{t.lastName}}</strong><small>{{t.headline||'Enseignant'}}</small><b>{{t.hourlyRate||0 | number}} FCFA/h</b></a>}@empty{<p class="empty-inline">Ajoutez des enseignants en favoris avec le cœur depuis la recherche.</p>}</div>
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
 intro(){return this.role==='TEACHER'?'Gérez vos demandes, vos cours et votre vérification.':this.role==='SCHOOL'?'Pilotez vos offres et vos candidatures.':'Suivez vos demandes, vos cours et vos paiements.'}
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
 earnings:any=null;billing:any=null;
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
 stats(){
  const upcoming=this.bookings.filter(b=>['PENDING_PAYMENT','CONFIRMED'].includes(b.status)).length;
  const pendingReq=this.requests.filter(r=>r.status==='PENDING').length;
  if(this.role==='PARENT')return[
   {icon:'calendar',label:'Cours à venir',value:upcoming,hint:'Réservations actives'},
   {icon:'wallet',label:'À payer',value:this.bookings.filter(b=>b.paymentStatus!=='PAID'&&b.status!=='CANCELLED').length,hint:'Paiements en attente'},
   {icon:'message',label:'Messages',value:this.unreadMessages,hint:'Non lu(s)'}];
  if(this.role==='TEACHER')return[
   {icon:'send',label:'Demandes',value:pendingReq,hint:'En attente de réponse'},
   {icon:'calendar',label:'Cours à venir',value:upcoming,hint:'Réservations actives'},
   {icon:'message',label:'Messages',value:this.unreadMessages,hint:'Non lu(s)'}];
  return[
   {icon:'briefcase',label:'Offres ouvertes',value:this.jobs.filter(j=>j.status==='OPEN').length,hint:'Visibles des enseignants'},
   {icon:'file',label:'Candidatures',value:this.jobs.reduce((s,j)=>s+(j.applicationsCount||0),0),hint:'Toutes offres'},
   {icon:'message',label:'Messages',value:this.unreadMessages,hint:'Non lu(s)'}];
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
