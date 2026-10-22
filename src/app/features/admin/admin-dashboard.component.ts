import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {ApiService,Page,errorMessage} from '../../core/api.service';
import {AuthService} from '../../core/auth/auth.service';
import {IconComponent} from '../../core/icon.component';
import {DOC_TYPES,LEVELS,REPORT_REASONS,ROLES,STATUS,SUBJECTS,label,statusClass} from '../../core/labels';

type Tab='overview'|'billing'|'certification'|'users'|'teachers'|'documents'|'schools'|'jobs'|'bookings'|'payments'|'reviews'|'audit';
interface TabState{items:any[];page:number;totalPages:number;total:number;loading:boolean}

const ENDPOINTS:{[k:string]:string}={users:'/api/v1/admin/users',teachers:'/api/v1/admin/teachers',documents:'/api/v1/admin/documents',
 schools:'/api/v1/admin/schools',jobs:'/api/v1/admin/jobs',bookings:'/api/v1/admin/bookings',payments:'/api/v1/admin/payments',
 reviews:'/api/v1/admin/reviews',audit:'/api/v1/admin/audit-logs'};

@Component({
 standalone:true,
 imports:[CommonModule,FormsModule,RouterLink,IconComponent],
 template:`
 <section class="page admin-page">
   <div class="admin-hero">
     <div><div class="eyebrow">Centre de contrôle</div><h1>Administration</h1><p>Comptes, vérification des enseignants, recrutement, paiements et modération.</p></div>
     <div class="dash-actions"><button class="btn" (click)="openCreate()"><app-icon name="user" [size]="18"/>Créer un compte</button><button class="btn ghost" (click)="auth.logout()"><app-icon name="logout" [size]="18"/>Déconnexion</button></div>
   </div>

   @if(flash){<p class="success" role="status">{{flash}}</p>}
   @if(error){<p class="error" role="alert">{{error}}</p>}
   @if(stats && !stats.mailEnabled){<p class="notice"><app-icon name="message" [size]="18"/> E-mails désactivés (MAIL_HOST non configuré sur Render) : les liens « mot de passe oublié » ne partent pas par e-mail. Utilisez « Lien de réinitialisation » pour les transmettre par WhatsApp ou SMS.</p>}

   @if(stats){
   <div class="stats modern-stats admin-stats">
     <div><span class="stat-icon"><app-icon name="users" [size]="22"/></span><small>Utilisateurs</small><strong>{{stats.users|number}}</strong><span>{{stats.activeUsers|number}} actifs · {{stats.parents|number}} parents</span></div>
     <div><span class="stat-icon"><app-icon name="cap" [size]="22"/></span><small>Enseignants</small><strong>{{stats.teachers|number}}</strong><span>{{stats.teachersPublic|number}} visibles · {{stats.pendingTeachers|number}} à vérifier</span></div>
     <div><span class="stat-icon"><app-icon name="file" [size]="22"/></span><small>Documents à vérifier</small><strong>{{stats.pendingDocuments|number}}</strong><span>CV, diplômes, pièces</span></div>
     <div><span class="stat-icon"><app-icon name="school" [size]="22"/></span><small>Écoles</small><strong>{{stats.schools|number}}</strong><span>{{stats.openJobs|number}} offres ouvertes</span></div>
     <div><span class="stat-icon"><app-icon name="calendar" [size]="22"/></span><small>Réservations</small><strong>{{stats.bookings|number}}</strong><span>{{stats.pendingBookings|number}} à payer</span></div>
     <div><span class="stat-icon"><app-icon name="wallet" [size]="22"/></span><small>Paiements</small><strong>{{stats.payments|number}}</strong><span>{{stats.pendingPayments|number}} en attente</span></div>
   </div>
   }

   <nav class="admin-tabs" aria-label="Sections d’administration">
     @for(t of tabs;track t.id){<button [class.active]="tab===t.id" (click)="go(t.id)"><app-icon [name]="t.icon" [size]="16"/>{{t.label}}@if(t.id==='documents'&&stats?.pendingDocuments){<b class="tab-badge">{{stats.pendingDocuments}}</b>}</button>}
   </nav>

   <!-- ============ OVERVIEW ============ -->
   @if(tab==='overview'){
   <div class="admin-grid">
     <article class="card">
       <div class="section-row"><h3><span class="h-ic"><app-icon name="file" [size]="18"/></span>Documents à vérifier</h3><button class="text-link" (click)="go('documents')">Tout voir</button></div>
       @for(d of pendingDocs;track d.id){
         <div class="row-item compact"><div class="row-main"><strong>{{d.teacherName}} — {{L(DOC_TYPES,d.type)}}</strong><small>{{d.createdAt|date:'d MMM y, HH:mm'}}</small></div>
           <div class="row-actions">@if(d.hasFile){<button class="btn small ghost" (click)="viewDoc(d)"><app-icon name="eye" [size]="16"/></button>}<button class="btn small" (click)="review(d,'APPROVED')">Approuver</button><button class="btn small danger" (click)="askReject(d)">Refuser</button></div></div>
       } @empty {<p class="empty-inline">Aucun document en attente.</p>}
     </article>
     <article class="card">
       <div class="section-row"><h3><span class="h-ic"><app-icon name="chart" [size]="18"/></span>Activité</h3></div>
       <div class="admin-kpis" *ngIf="stats">
         <div><span>Demandes de cours</span><strong>{{stats.courseRequestsPending|number}}</strong><small>en attente / {{stats.courseRequests|number}}</small></div>
         <div><span>Candidatures</span><strong>{{stats.applications|number}}</strong><small>total</small></div>
         <div><span>Avis</span><strong>{{stats.reviews|number}}</strong><small>publiés</small></div>
         <div><span>Administrateurs</span><strong>{{stats.admins|number}}</strong><small>comptes</small></div>
       </div>
     </article>
   </div>
   }

   <!-- ============ REVENUE ============ -->
   @if(tab==='billing'&&bill.settings){
   <div class="billing-kpis">
     <div class="card"><small>Commissions ce mois</small><strong>{{bill.overview?.commissionsThisMonth|number}} FCFA</strong><span>sur {{bill.overview?.volumeThisMonth|number}} FCFA de cours payés</span></div>
     <div class="card"><small>Abonnements écoles</small><strong>{{bill.overview?.subscriptionsMonthly|number}} FCFA</strong><span>par mois · @for(e of planEntries();track e[0]){<span>{{e[1]}} {{e[0]}} </span>}@empty{<span>aucun actif</span>}</span></div>
     <div class="card"><small>À verser aux enseignants</small><strong>{{bill.overview?.teacherBalances|number}} FCFA</strong><span>{{bill.balances.length}} enseignant(s)</span></div>
     <div class="card"><small>Commissions totales</small><strong>{{bill.overview?.commissionsTotal|number}} FCFA</strong><span>depuis le lancement</span></div>
   </div>

   <div class="admin-grid">
     <article class="card">
       <div class="section-row"><h3><span class="h-ic"><app-icon name="chart" [size]="18"/></span>Règles de rémunération</h3></div>
       <form class="stack" (ngSubmit)="saveSettings()">
         <label class="check switch"><input type="checkbox" name="mon" [(ngModel)]="bill.form.monetizationEnabled"> <span><b>Monétisation active</b><br><small class="muted">Désactivée = phase de lancement : tout est gratuit, aucune commission ni limite.</small></span></label>
         <div class="two"><label>Commission (%)<input type="number" min="0" max="50" name="cr" [(ngModel)]="bill.form.commissionRate"></label><label>Commission fidélité (%)<input type="number" min="0" max="50" name="lr" [(ngModel)]="bill.form.loyaltyRate"></label></div>
         <div class="two"><label>Heures pour la fidélité<input type="number" min="0" name="lh" [(ngModel)]="bill.form.loyaltyHours"></label><label>Offres gratuites (écoles)<input type="number" min="0" name="fl" [(ngModel)]="bill.form.freeOfferLimit"></label></div>
         <div class="two"><label>Standard (FCFA/mois)<input type="number" min="0" step="1000" name="sp" [(ngModel)]="bill.form.standardPrice"></label><label>Premium (FCFA/mois)<input type="number" min="0" step="1000" name="pp" [(ngModel)]="bill.form.premiumPrice"></label></div>
         <button class="btn" [disabled]="busy">Enregistrer les règles</button>
       </form>
     </article>
     <article class="card">
       <div class="section-row"><h3><span class="h-ic"><app-icon name="school" [size]="18"/></span>Abonnements à valider</h3><small>{{bill.pending.length}} en attente</small></div>
       @for(s of bill.pending;track s.id){
         <div class="row-item compact"><div class="row-main"><strong>{{s.schoolName}} — {{s.plan}}</strong><small>{{s.amount|number}} FCFA · réf. <b>{{s.reference}}</b> · {{s.createdAt|date:'d MMM, HH:mm'}}</small></div>
           <div class="row-actions"><button class="btn small" (click)="subAction(s,'activate')">Paiement reçu</button><button class="btn small danger" (click)="subAction(s,'cancel')">Annuler</button></div></div>
       } @empty {<p class="empty-inline">Aucune demande en attente.</p>}
       @if(bill.active.length){<h3 class="sub-title">Actifs</h3>}
       @for(s of bill.active;track s.id){
         <div class="row-item compact"><div class="row-main"><strong>{{s.schoolName}} — {{s.plan}}</strong><small>jusqu’au {{s.endsAt|date:'d MMM y'}}</small></div><span class="status ok">Actif</span></div>
       }
     </article>
   </div>

   <article class="card block">
     <div class="section-row"><h3><span class="h-ic"><app-icon name="wallet" [size]="18"/></span>Versements aux enseignants</h3><small>Part enseignant des cours payés en ligne</small></div>
     @for(b of bill.balances;track b.teacherId){
       <div class="row-item"><div class="row-main"><strong>{{b.teacherName}}</strong><small>{{b.payments}} paiement(s) en attente de versement</small></div>
         <div class="row-tags"><b>{{b.amount|number}} FCFA</b></div>
         <div class="row-actions"><button class="btn small" (click)="openPayout(b)">Marquer comme versé</button></div>
         @if(payoutFor===b.teacherId){
           <form class="inline-form" (ngSubmit)="doPayout(b)">
             <select name="pm" [(ngModel)]="payoutForm.method"><option value="ORANGE_MONEY">Orange Money</option><option value="MOOV_MONEY">Moov Money</option><option value="WAVE">Wave</option><option value="VIREMENT">Virement</option></select>
             <input name="pr" [(ngModel)]="payoutForm.reference" placeholder="Référence de la transaction">
             <button class="btn small">Confirmer {{b.amount|number}} FCFA</button><button type="button" class="text-link" (click)="payoutFor=null">Annuler</button>
           </form>
         }
       </div>
     } @empty {<p class="empty-inline">Rien à verser pour le moment.</p>}
     @if(bill.payouts.length){<h3 class="sub-title">Derniers versements</h3>}
     @for(p of bill.payouts;track p.id){
       <div class="row-item compact"><div class="row-main"><strong>{{p.teacherName}}</strong><small>{{p.method||'—'}} · réf. {{p.reference||'—'}} · {{p.createdAt|date:'d MMM y, HH:mm'}}</small></div><b>{{p.amount|number}} FCFA</b></div>
     }
   </article>
   }

   <!-- ============ CERTIFICATION ============ -->
   @if(tab==='certification'&&cert.settings){
   <div class="billing-kpis">
     <div class="card"><small>Tests passés</small><strong>{{cert.overview?.attempts||0}}</strong><span>{{cert.overview?.passed||0}} réussis ({{passRate()}} %)</span></div>
     <div class="card"><small>Certifiés Profa</small><strong>{{cert.overview?.certified||0}}</strong><span>enseignants</span></div>
     <div class="card"><small>Vidéos à valider</small><strong>{{cert.overview?.pendingVideos||0}}</strong><span>en attente</span></div>
     <div class="card"><small>Signalements ouverts</small><strong>{{cert.overview?.openReports||0}}</strong><span>{{cert.overview?.suspended||0}} enseignant(s) suspendu(s)</span></div>
   </div>

   <div class="admin-grid">
     <article class="card">
       <div class="section-row"><h3><span class="h-ic"><app-icon name="message" [size]="18"/></span>Signalements</h3><small>{{cert.reports.length}} ouvert(s)</small></div>
       @for(r of cert.reports;track r.id){
         <div class="row-item compact report-row" [class.urgent]="r.reason==='SAFETY'"><div class="row-main"><strong>{{r.teacherName}} — {{L(REPORT_REASONS,r.reason)}}</strong><small>par {{r.reporterName}} · {{r.createdAt|date:'d MMM, HH:mm'}}</small>@if(r.details){<small class="note">« {{r.details}} »</small>}</div>
           <div class="row-actions">@if(r.teacherProfileId){<a class="btn small ghost" [routerLink]="['/enseignants',r.teacherProfileId]"><app-icon name="eye" [size]="16"/></a>}<button class="btn small ghost" (click)="resolveReport(r,false)">Classer</button><button class="btn small danger" (click)="resolveReport(r,true)">Suspendre</button></div></div>
       } @empty {<p class="empty-inline">Aucun signalement ouvert.</p>}
       @if(cert.suspended.length){<h3 class="sub-title">Enseignants suspendus</h3>}
       @for(t of cert.suspended;track t.id){
         <div class="row-item compact"><div class="row-main"><strong>{{t.name}}</strong><small>{{t.suspendedReason}}</small></div><button class="btn small" (click)="unsuspend(t)">Réactiver</button></div>
       }
     </article>
     <article class="card">
       <div class="section-row"><h3><span class="h-ic"><app-icon name="video" [size]="18"/></span>Vidéos de présentation</h3><small>{{cert.videos.length}} à valider</small></div>
       @for(v of cert.videos;track v.id){
         <div class="row-item compact"><div class="row-main"><strong>{{v.name}}</strong><small><a class="text-link" [href]="v.videoUrl" target="_blank" rel="noopener">Ouvrir la vidéo</a> · {{v.headline||'—'}}</small></div>
           <div class="row-actions"><button class="btn small" (click)="reviewVideo(v,'APPROVED')">Valider</button><button class="btn small danger" (click)="reviewVideo(v,'REJECTED')">Refuser</button></div></div>
       } @empty {<p class="empty-inline">Aucune vidéo en attente.</p>}
     </article>
   </div>

   <article class="card block">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon name="book" [size]="18"/></span>Banque de questions</h3>
       <small>Un test devient disponible dès qu’une matière/niveau compte au moins {{cert.settings.quizQuestionCount}} questions.</small></div></div>
     <div class="bank-chips">@for(b of cert.overview?.bank||[];track b.subject+b.level){<button type="button" class="chip" [class.on]="qf.subject===b.subject&&qf.level===b.level" (click)="qf={subject:b.subject,level:b.level};resetQuestion();loadQuestions(0)">{{b.subject}} · {{b.level}} <b>{{b.questions}}</b>@if(b.ready){ ✓}</button>}@empty{<span class="muted small">Banque vide : ajoutez ou importez des questions.</span>}</div>

     <details class="import-box" [open]="!(cert.overview?.bank?.length)"><summary><app-icon name="file" [size]="16"/> Importer depuis Excel (CSV)</summary>
       <p class="muted small">Dans Excel : une ligne par question, colonnes <b>matière ; niveau ; question ; réponse 1 ; réponse 2 ; … ; numéro de la bonne réponse</b> (2 à 6 réponses), puis « Enregistrer sous → CSV (séparateur point-virgule) ».</p>
       <div class="inline-form"><input type="file" accept=".csv,text/csv,text/plain" (change)="readCsv($event)"><button type="button" class="text-link" (click)="downloadTemplate()">Télécharger un modèle</button></div>
       <textarea rows="5" [(ngModel)]="csvText" name="csv" placeholder="Mathématiques;Lycée (BAC);Combien vaut 7 × 8 ?;54;56;64;48;2"></textarea>
       <button class="btn small" [disabled]="busy||!csvText.trim()" (click)="importCsv()">Importer</button>
       @if(importResult){<p class="success">{{importResult.imported}} question(s) importée(s).</p>@for(e of importResult.errors;track e){<p class="error small">{{e}}</p>}}
     </details>

     <form class="question-form" (ngSubmit)="saveQuestion()">
       <div class="two"><label>Matière<input name="qs" list="adm-subjects" [(ngModel)]="qform.subject" required></label><label>Niveau<select name="ql" [(ngModel)]="qform.level">@for(l of LEVELS;track l){<option [value]="l">{{l}}</option>}</select></label></div>
       <datalist id="adm-subjects">@for(s of SUBJECTS;track s){<option [value]="s"></option>}</datalist>
       <label>Question<textarea name="qt" rows="2" [(ngModel)]="qform.text" required></textarea></label>
       @for(c of qform.choices;track $index;let i=$index){
         <label class="choice-row"><input type="radio" name="qc" [value]="i" [(ngModel)]="qform.correctIndex" title="Bonne réponse"><input [name]="'qc'+i" [(ngModel)]="qform.choices[i]" placeholder="Réponse {{i+1}}"></label>
       }
       <div class="row-actions"><button type="button" class="text-link" (click)="qform.choices.push('')" [disabled]="qform.choices.length>=6">+ Ajouter une réponse</button><button class="btn small" [disabled]="busy">{{qform.id?'Enregistrer':'Ajouter la question'}}</button>@if(qform.id){<button type="button" class="text-link" (click)="resetQuestion()">Annuler</button>}</div>
       <p class="muted small">Cochez le rond à gauche de la bonne réponse.</p>
     </form>

     @if(qf.subject){<h3 class="sub-title">{{qf.subject}} · {{qf.level}} — {{cert.questions.totalElements||0}} question(s)</h3>}
     @for(q of cert.questions.content||[];track q.id){
       <div class="row-item compact"><div class="row-main"><strong>{{q.text}}</strong><small>@for(c of q.choiceList;track $index;let j=$index){<span [class.ok-text]="j===q.correctIndex">{{j+1}}. {{c}}{{j===q.correctIndex?' ✓':''}} </span>}</small></div>
         <div class="row-actions"><button class="btn small ghost" (click)="editQuestion(q)"><app-icon name="edit" [size]="16"/></button><button class="btn small danger" (click)="deleteQuestion(q)"><app-icon name="trash" [size]="16"/></button></div></div>
     }
     @if((cert.questions.totalPages||0)>1){<div class="pager"><button class="btn small ghost" [disabled]="cert.questions.page===0" (click)="loadQuestions(cert.questions.page-1)">Précédent</button><span>Page {{cert.questions.page+1}} / {{cert.questions.totalPages}}</span><button class="btn small ghost" [disabled]="cert.questions.page+1>=cert.questions.totalPages" (click)="loadQuestions(cert.questions.page+1)">Suivant</button></div>}
   </article>

   <article class="card block">
     <div class="section-row"><h3><span class="h-ic"><app-icon name="chart" [size]="18"/></span>Règles de certification</h3></div>
     <form class="stack" (ngSubmit)="saveCertSettings()">
       <label class="check switch"><input type="checkbox" name="rc" [(ngModel)]="cert.form.requireCertification"> <span><b>Test obligatoire pour apparaître dans la recherche</b><br><small class="muted">À activer quand la banque couvre les matières principales.</small></span></label>
       <label class="check switch"><input type="checkbox" name="rr" [(ngModel)]="cert.form.requireRecordForHome"> <span><b>Casier judiciaire obligatoire pour les cours à domicile</b><br><small class="muted">Recommandé : protège les enfants et rassure les parents.</small></span></label>
       <div class="four"><label>Questions par test<input type="number" min="5" max="100" name="qn" [(ngModel)]="cert.form.quizQuestionCount"></label><label>Durée (min)<input type="number" min="5" max="180" name="qd" [(ngModel)]="cert.form.quizDurationMinutes"></label><label>Réussite (%)<input type="number" min="1" max="100" name="qp" [(ngModel)]="cert.form.quizPassScore"></label><label>Tentatives<input type="number" min="1" name="qa" [(ngModel)]="cert.form.quizMaxAttempts"></label></div>
       <div class="four"><label>Délai après échecs (jours)<input type="number" min="0" name="qc2" [(ngModel)]="cert.form.quizCooldownDays"></label><label>Suspension si note &lt;<input type="number" min="0" max="5" step="0.1" name="st" [(ngModel)]="cert.form.suspendThreshold"></label><label>…après N avis<input type="number" min="1" name="sm" [(ngModel)]="cert.form.suspendMinReviews"></label></div>
       <button class="btn" [disabled]="busy">Enregistrer les règles</button>
     </form>
   </article>
   }

   <!-- ============ LIST TABS ============ -->
   @if(tab!=='overview'&&tab!=='billing'&&tab!=='certification'){
   <div class="card admin-table-card">
     <div class="section-row">
       <div><h3>{{tabLabel()}}</h3><small>{{state().total|number}} élément(s)</small></div>
       <div class="admin-filters">
         @if(tab==='users'||tab==='teachers'){<input class="admin-search" [(ngModel)]="q" (ngModelChange)="typed()" placeholder="Rechercher (nom, e-mail, téléphone)…" aria-label="Rechercher">}
         @if(tab==='users'){
           <select [(ngModel)]="roleFilter" (ngModelChange)="reload()" aria-label="Rôle"><option value="">Tous les rôles</option>@for(r of roleKeys;track r){<option [value]="r">{{ROLES[r]}}</option>}</select>
           <select [(ngModel)]="statusFilter" (ngModelChange)="reload()" aria-label="Statut"><option value="">Tous statuts</option><option value="ACTIVE">Actifs</option><option value="BLOCKED">Bloqués</option></select>
         }
         @if(tab==='teachers'){<select [(ngModel)]="teacherFilter" (ngModelChange)="reload()" aria-label="Filtre"><option value="">Tous</option><option value="PENDING">À vérifier</option><option value="VERIFIED">Vérifiés</option><option value="INCOMPLETE">Dossier incomplet</option></select>}
         @if(tab==='documents'){<select [(ngModel)]="docFilter" (ngModelChange)="reload()" aria-label="Statut"><option value="PENDING">En attente</option><option value="APPROVED">Approuvés</option><option value="REJECTED">Refusés</option><option value="">Tous</option></select>}
       </div>
     </div>

     <div class="admin-list-rows" [class.loading]="state().loading">
     @switch(tab){
       @case('users'){
         @for(u of state().items;track u.id){
           <div class="admin-row">
             <div class="row-main"><strong>{{u.firstName}} {{u.lastName}}@if(u.id===meId){ <span class="pill soft">vous</span>}</strong><small>{{u.email}}@if(u.phone){ · {{u.phone}}}</small><small>Inscrit le {{u.createdAt|date:'d MMM y'}}@if(u.lastLoginAt){ · dernière connexion {{u.lastLoginAt|date:'d MMM, HH:mm'}}}</small></div>
             <div class="row-tags"><span class="pill">{{L(ROLES,u.role)}}</span><span class="status" [class]="u.enabled?'ok':'ko'">{{u.enabled?'Actif':'Bloqué'}}</span>@if(u.verified){<span class="status ok">Vérifié</span>}</div>
             <div class="row-actions">
               <button class="btn small ghost" (click)="openEdit(u)" title="Modifier"><app-icon name="edit" [size]="16"/></button>
               <button class="btn small ghost" (click)="resetLinkFor(u)" title="Lien de réinitialisation du mot de passe"><app-icon name="lock" [size]="16"/></button>
               @if(u.id!==meId){
                 <button class="btn small" [class.danger]="u.enabled" (click)="toggleUser(u)">{{u.enabled?'Bloquer':'Activer'}}</button>
                 <button class="btn small danger" (click)="askDelete(u)" title="Supprimer"><app-icon name="trash" [size]="16"/></button>
               }
             </div>
           </div>
         } @empty {<p class="empty-inline pad">Aucun utilisateur.</p>}
       }
       @case('teachers'){
         @for(t of state().items;track t.id){
           <div class="admin-row">
             <div class="row-main"><strong>{{t.name}}</strong><small>{{t.email}}@if(t.phone){ · {{t.phone}}}</small><small>{{t.headline||'Sans titre'}} · {{t.city||'—'}} · {{t.hourlyRate||0|number}} FCFA/h · {{t.ratingAvg|number:'1.1-1'}}★ ({{t.reviewCount}})</small></div>
             <div class="row-tags"><span class="status" [class]="t.documentsComplete?'ok':'ko'">{{t.documentsComplete?'Dossier complet':'CV/diplôme manquant'}}</span><span class="status" [class]="t.verified?'ok':'wait'">{{t.verified?'Vérifié':'Non vérifié'}}</span></div>
             <div class="row-actions">
               <button class="btn small ghost" (click)="openTeacherDocs(t)"><app-icon name="file" [size]="16"/>Documents</button>
               @if(t.verified){<button class="btn small ghost" (click)="act('/api/v1/admin/teachers/'+t.id+'/unverify','Badge retiré.')">Retirer badge</button>}
               @else{<button class="btn small" [disabled]="!t.documentsComplete" (click)="act('/api/v1/admin/teachers/'+t.id+'/verify','Enseignant vérifié.')">Vérifier</button>}
               <a class="btn small ghost" [routerLink]="['/enseignants',t.id]" title="Profil"><app-icon name="eye" [size]="16"/></a>
             </div>
           </div>
         } @empty {<p class="empty-inline pad">Aucun enseignant.</p>}
       }
       @case('documents'){
         @for(d of state().items;track d.id){
           <div class="admin-row">
             <div class="row-main"><strong>{{d.teacherName}} — {{L(DOC_TYPES,d.type)}}</strong><small>@if(d.hasFile){<span>{{d.fileName}} · {{kb(d.sizeBytes)}}</span>}@else{<span>Ancien lien (non PDF)</span>} · envoyé le {{d.createdAt|date:'d MMM y, HH:mm'}}</small>@if(d.rejectionReason){<small class="error">Motif : {{d.rejectionReason}}</small>}</div>
             <div class="row-tags"><span class="status" [class]="sc(d.status)">{{L(STATUS,d.status)}}</span></div>
             <div class="row-actions">
               @if(d.hasFile){<button class="btn small ghost" (click)="viewDoc(d)"><app-icon name="eye" [size]="16"/>Ouvrir</button>}
               @if(d.status!=='APPROVED'){<button class="btn small" (click)="review(d,'APPROVED')">Approuver</button>}
               @if(d.status!=='REJECTED'){<button class="btn small danger" (click)="askReject(d)">Refuser</button>}
             </div>
           </div>
         } @empty {<p class="empty-inline pad">Aucun document.</p>}
       }
       @case('schools'){
         @for(s of state().items;track s.id){
           <div class="admin-row"><div class="row-main"><strong>{{s.name||'École sans nom'}}</strong><small>{{s.city||'—'}} · {{s.address||'Adresse non renseignée'}}</small></div><div class="row-tags"><span>{{s.employeeCount||0}} employés</span></div><div class="row-actions"><span class="muted small">{{s.phone||'—'}}</span></div></div>
         } @empty {<p class="empty-inline pad">Aucune école.</p>}
       }
       @case('jobs'){
         @for(j of state().items;track j.id){
           <div class="admin-row"><div class="row-main"><strong>{{j.title}}</strong><small>{{j.subject||'—'}} · {{j.city||'—'}} · {{j.applicationsCount||0}} candidature(s) · {{j.createdAt|date:'d MMM y'}}</small></div>
             <div class="row-tags"><span class="status" [class]="sc(j.status)">{{L(STATUS,j.status)}}</span></div>
             <div class="row-actions"><button class="btn small ghost" (click)="act('/api/v1/admin/jobs/'+j.id+'/status','Offre mise à jour.',{status:j.status==='OPEN'?'CLOSED':'OPEN'})">{{j.status==='OPEN'?'Fermer':'Rouvrir'}}</button><button class="btn small danger" (click)="remove('/api/v1/admin/jobs/'+j.id,'Supprimer l’offre « '+j.title+' » et ses candidatures ?')"><app-icon name="trash" [size]="16"/></button></div></div>
         } @empty {<p class="empty-inline pad">Aucune offre.</p>}
       }
       @case('bookings'){
         @for(b of state().items;track b.id){
           <div class="admin-row"><div class="row-main"><strong>{{b.parentName}} → {{b.teacherName}}</strong><small>{{b.startsAt|date:'d MMM y, HH:mm'}} · {{b.mode}}</small></div>
             <div class="row-tags"><span class="status" [class]="sc(b.status)">{{L(STATUS,b.status)}}</span><span class="status" [class]="sc(b.paymentStatus)">{{L(STATUS,b.paymentStatus)}}</span><b>{{b.amount||0|number}} FCFA</b></div>
             <div class="row-actions">@if(b.status!=='CANCELLED'&&b.status!=='COMPLETED'){<button class="btn small danger" (click)="act('/api/v1/admin/bookings/'+b.id+'/status','Réservation annulée.',{status:'CANCELLED'})">Annuler</button>}</div></div>
         } @empty {<p class="empty-inline pad">Aucune réservation.</p>}
       }
       @case('payments'){
         @for(p of state().items;track p.id){
           <div class="admin-row"><div class="row-main"><strong>{{p.amount||0|number}} {{p.currency||'XOF'}}</strong><small>{{p.method||'—'}} · réf. {{p.externalReference||'—'}} · {{p.createdAt|date:'d MMM y, HH:mm'}}</small></div>
             <div class="row-tags"><span class="status" [class]="sc(p.status)">{{L(STATUS,p.status)}}</span></div>
             <div class="row-actions">@if(p.status==='PENDING'){<button class="btn small" (click)="act('/api/v1/admin/payments/'+p.id+'/status','Paiement confirmé.',{status:'CONFIRMED'})">Confirmer</button><button class="btn small danger" (click)="act('/api/v1/admin/payments/'+p.id+'/status','Paiement marqué échoué.',{status:'FAILED'})">Échec</button>}</div></div>
         } @empty {<p class="empty-inline pad">Aucun paiement.</p>}
       }
       @case('reviews'){
         @for(r of state().items;track r.id){
           <div class="admin-row"><div class="row-main"><strong>{{r.authorName}} → {{r.teacherName}}</strong><small><span class="stars">{{'★'.repeat(r.rating)}}</span> · {{r.createdAt|date:'d MMM y'}}</small>@if(r.comment){<small class="note">« {{r.comment}} »</small>}</div>
             <div class="row-tags"></div><div class="row-actions"><button class="btn small danger" (click)="remove('/api/v1/admin/reviews/'+r.id,'Supprimer cet avis ? La note de l’enseignant sera recalculée.')"><app-icon name="trash" [size]="16"/>Supprimer</button></div></div>
         } @empty {<p class="empty-inline pad">Aucun avis.</p>}
       }
       @case('audit'){
         @for(l of state().items;track l.id){
           <div class="admin-row"><div class="row-main"><strong>{{actionLabel(l.action)}}</strong><small>{{l.details||'—'}}</small></div><div class="row-tags"><span class="pill soft">{{l.adminName}}</span></div><div class="row-actions"><span class="muted small">{{l.createdAt|date:'d MMM y, HH:mm:ss'}}</span></div></div>
         } @empty {<p class="empty-inline pad">Aucune action enregistrée.</p>}
       }
     }
     </div>

     @if(state().totalPages>1){
       <div class="pager"><button class="btn small ghost" [disabled]="state().page===0" (click)="goPage(state().page-1)"><app-icon name="back" [size]="16"/>Précédent</button><span>Page {{state().page+1}} / {{state().totalPages}}</span><button class="btn small ghost" [disabled]="state().page+1>=state().totalPages" (click)="goPage(state().page+1)">Suivant<app-icon name="arrow" [size]="16"/></button></div>
     }
   </div>
   }
 </section>

 <!-- ============ MODALS ============ -->
 @if(modal){
 <div class="modal-backdrop" (click)="closeModal()">
   <div class="modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
     <button class="modal-close" (click)="closeModal()" aria-label="Fermer"><app-icon name="x" [size]="18"/></button>

     @if(modal==='create'){
       <h2>Créer un compte</h2>
       @if(!created){
       <form class="stack" (ngSubmit)="create()" #cf="ngForm">
         <div class="two"><label>Prénom<input name="firstName" [(ngModel)]="form.firstName" required></label><label>Nom<input name="lastName" [(ngModel)]="form.lastName" required></label></div>
         <label>E-mail<input name="email" type="email" [(ngModel)]="form.email" required email></label>
         <label>Téléphone<input name="phone" type="tel" [(ngModel)]="form.phone"></label>
         <label>Rôle<select name="role" [(ngModel)]="form.role">@for(r of roleKeys;track r){<option [value]="r">{{ROLES[r]}}</option>}</select></label>
         <p class="muted small">La personne choisit elle-même son mot de passe grâce au lien généré (valable 60 minutes).</p>
         <button class="btn full" [disabled]="busy||cf.invalid">Créer le compte</button>
       </form>
       } @else {
         <div class="result-panel ok"><app-icon name="check" [size]="22"/><div><strong>Compte créé</strong><p>Transmettez ce lien pour que la personne définisse son mot de passe.</p></div></div>
         <ng-container *ngTemplateOutlet="linkBox"/>
       }
     }

     @if(modal==='edit'){
       <h2>Modifier {{target.firstName}} {{target.lastName}}</h2>
       <form class="stack" (ngSubmit)="saveEdit()">
         <div class="two"><label>Prénom<input name="firstName" [(ngModel)]="form.firstName"></label><label>Nom<input name="lastName" [(ngModel)]="form.lastName"></label></div>
         <label>E-mail<input name="email" type="email" [(ngModel)]="form.email"></label>
         <label>Téléphone<input name="phone" type="tel" [(ngModel)]="form.phone"></label>
         <button class="btn full" [disabled]="busy">Enregistrer</button>
       </form>
       @if(target.id!==meId){
       <div class="modal-section">
         <h3>Rôle</h3>
         <div class="inline-form"><select [(ngModel)]="form.role" name="role">@for(r of roleKeys;track r){<option [value]="r">{{ROLES[r]}}</option>}</select><button class="btn small" [disabled]="busy||form.role===target.role" (click)="saveRole()">Changer le rôle</button></div>
         <p class="muted small">Le changement de rôle déconnecte la personne, qui devra se reconnecter.</p>
         <h3>Vérification</h3>
         <button class="btn small ghost" (click)="toggleVerified()">{{target.verified?'Retirer la vérification':'Marquer comme vérifié'}}</button>
       </div>
       }
     }

     @if(modal==='reset'){
       <h2>Lien de réinitialisation</h2>
       <p class="muted">Pour <b>{{target.firstName}} {{target.lastName}}</b> ({{target.email}}). Le lien est valable 60 minutes et ne sert qu’une fois.@if(resetEmailed){ Il a aussi été envoyé par e-mail.}</p>
       <ng-container *ngTemplateOutlet="linkBox"/>
     }

     @if(modal==='delete'){
       <h2>Supprimer le compte</h2>
       <div class="result-panel ko"><app-icon name="trash" [size]="22"/><div><strong>Action définitive</strong><p>Le compte de <b>{{target.firstName}} {{target.lastName}}</b> ({{target.email}}), son profil, ses documents, messages, favoris, offres et demandes seront supprimés. Les réservations et paiements sont conservés pour la comptabilité.</p></div></div>
       <label class="stack">Tapez <b>SUPPRIMER</b> pour confirmer<input [(ngModel)]="confirmText" name="confirm" autocomplete="off"></label>
       <button class="btn danger full" [disabled]="busy||confirmText!=='SUPPRIMER'" (click)="doDelete()">Supprimer définitivement</button>
     }

     @if(modal==='reject'){
       <h2>Refuser le document</h2>
       <p class="muted">{{target.teacherName}} — {{L(DOC_TYPES,target.type)}}. L’enseignant verra ce motif et pourra renvoyer un PDF.</p>
       <form class="stack" (ngSubmit)="doReject()">
         <label>Motif<textarea name="reason" rows="3" [(ngModel)]="reason" placeholder="Ex. : document illisible, diplôme non conforme…" required></textarea></label>
         <div class="chips">@for(r of quickReasons;track r){<button type="button" class="chip" (click)="reason=r">{{r}}</button>}</div>
         <button class="btn danger full" [disabled]="busy||!reason.trim()">Refuser</button>
       </form>
     }

     @if(modal==='teacherDocs'){
       <h2>Documents de {{target.name}}</h2>
       @for(d of teacherDocs;track d.id){
         <div class="row-item compact"><div class="row-main"><strong>{{L(DOC_TYPES,d.type)}}</strong><small>@if(d.hasFile){<span>{{d.fileName}} · {{kb(d.sizeBytes)}}</span>}@else{<span>Ancien lien</span>}</small></div><span class="status" [class]="sc(d.status)">{{L(STATUS,d.status)}}</span>
           <div class="row-actions">@if(d.hasFile){<button class="btn small ghost" (click)="viewDoc(d)"><app-icon name="eye" [size]="16"/></button>}@if(d.status!=='APPROVED'){<button class="btn small" (click)="review(d,'APPROVED')">Approuver</button>}@if(d.status!=='REJECTED'){<button class="btn small danger" (click)="askReject(d)">Refuser</button>}</div></div>
       } @empty {<p class="empty-inline">Aucun document envoyé.</p>}
     }

     @if(modalError){<p class="error" role="alert">{{modalError}}</p>}
   </div>
 </div>
 }

 <ng-template #linkBox>
   <div class="link-box"><input [value]="link" readonly (focus)="$any($event.target).select()" aria-label="Lien"><button class="btn small" (click)="copy()">{{copied?'Copié ✓':'Copier'}}</button></div>
   <a class="btn ghost full" [href]="whatsapp()" target="_blank" rel="noopener"><app-icon name="phone" [size]="18"/>Envoyer par WhatsApp</a>
 </ng-template>`
})
export class AdminDashboardComponent implements OnInit{
 api=inject(ApiService);auth=inject(AuthService);
 DOC_TYPES=DOC_TYPES;ROLES=ROLES;STATUS=STATUS;L=label;sc=statusClass;roleKeys=Object.keys(ROLES);
 meId=this.auth.userId();
 tabs:{id:Tab;label:string;icon:string}[]=[
  {id:'overview',label:'Vue générale',icon:'grid'},{id:'billing',label:'Revenus',icon:'wallet'},{id:'certification',label:'Certification',icon:'shield'},{id:'users',label:'Utilisateurs',icon:'users'},{id:'teachers',label:'Enseignants',icon:'cap'},
  {id:'documents',label:'Documents',icon:'file'},{id:'schools',label:'Écoles',icon:'school'},{id:'jobs',label:'Offres',icon:'briefcase'},
  {id:'bookings',label:'Réservations',icon:'calendar'},{id:'payments',label:'Paiements',icon:'wallet'},{id:'reviews',label:'Avis',icon:'star'},
  {id:'audit',label:'Journal',icon:'clock'}];
 quickReasons=['Document illisible','Ce n’est pas un CV','Diplôme non reconnu','Nom différent du compte'];
 tab:Tab='overview';stats:any=null;pendingDocs:any[]=[];
 states:{[k:string]:TabState}={};
 q='';roleFilter='';statusFilter='';teacherFilter='';docFilter='PENDING';
 flash='';error='';modal:string|null=null;modalError='';busy=false;
 target:any=null;form:any={};created=false;link='';copied=false;resetEmailed=false;confirmText='';reason='';teacherDocs:any[]=[];
 private debounce:any;

 ngOnInit(){this.loadStats()}
 state():TabState{return this.states[this.tab]||(this.states[this.tab]={items:[],page:0,totalPages:0,total:0,loading:false})}
 tabLabel(){return this.tabs.find(t=>t.id===this.tab)?.label||''}
 go(t:Tab){this.tab=t;this.error='';if(t==='overview')this.loadStats();else if(t==='billing')this.loadBilling();else if(t==='certification')this.loadCert();else this.load(0)}
 reload(){this.load(0)}
 goPage(p:number){this.load(p);window.scrollTo({top:0,behavior:'smooth'})}
 typed(){clearTimeout(this.debounce);this.debounce=setTimeout(()=>this.load(0),350)}

 loadStats(){
  this.api.get<any>('/api/v1/admin/stats').subscribe({next:x=>this.stats=x,error:e=>this.error=errorMessage(e,'Impossible de charger les statistiques.')});
  this.api.get<Page<any>>('/api/v1/admin/documents',{status:'PENDING',size:6}).subscribe({next:x=>this.pendingDocs=x.content,error:()=>{}});
 }
 load(page:number){
  const t=this.tab;if(t==='overview')return;
  const st=this.state();st.loading=true;
  const params:any={page,size:20};
  if(t==='users'){params.q=this.q;params.role=this.roleFilter;params.status=this.statusFilter}
  if(t==='teachers'){params.q=this.q;params.filter=this.teacherFilter}
  if(t==='documents'){params.status=this.docFilter}
  this.api.get<Page<any>>(ENDPOINTS[t],params).subscribe({
   next:x=>{this.states[t]={items:x.content,page:x.page,totalPages:x.totalPages,total:x.totalElements,loading:false}},
   error:e=>{st.loading=false;this.error=errorMessage(e)}});
 }
 private ok(msg:string){this.flash=msg;this.error='';setTimeout(()=>this.flash='',4000)}
 private refresh(){this.loadStats();if(this.tab!=='overview')this.load(this.state().page)}

 /** PATCH helper for one-click actions. */
 act(url:string,msg:string,params:any={}){
  this.api.patch(url,{},params).subscribe({next:()=>{this.ok(msg);this.refresh()},error:e=>this.error=errorMessage(e)});
 }
 remove(url:string,question:string){
  if(!confirm(question))return;
  this.api.delete(url).subscribe({next:()=>{this.ok('Supprimé.');this.refresh()},error:e=>this.error=errorMessage(e)});
 }

 // users
 toggleUser(u:any){this.act(`/api/v1/admin/users/${u.id}/enabled`,u.enabled?'Compte bloqué : la personne est déconnectée.':'Compte activé.',{enabled:!u.enabled})}
 openCreate(){this.form={role:'PARENT'};this.created=false;this.link='';this.copied=false;this.modalError='';this.modal='create'}
 create(){
  this.busy=true;this.modalError='';
  this.api.post<any>('/api/v1/admin/users',this.form).subscribe({
   next:r=>{this.busy=false;this.created=true;this.link=r.resetLink;this.target=r.user;this.refresh()},
   error:e=>{this.busy=false;this.modalError=errorMessage(e)}});
 }
 openEdit(u:any){this.target=u;this.form={firstName:u.firstName,lastName:u.lastName,email:u.email,phone:u.phone||'',role:u.role};this.modalError='';this.modal='edit'}
 saveEdit(){
  this.busy=true;
  this.api.put<any>(`/api/v1/admin/users/${this.target.id}`,this.form).subscribe({
   next:u=>{this.busy=false;this.target=u;this.ok('Compte mis à jour.');this.closeModal();this.refresh()},
   error:e=>{this.busy=false;this.modalError=errorMessage(e)}});
 }
 saveRole(){
  if(!confirm(`Passer ce compte en « ${ROLES[this.form.role]} » ?`))return;
  this.busy=true;
  this.api.patch<any>(`/api/v1/admin/users/${this.target.id}/role`,{},{role:this.form.role}).subscribe({
   next:u=>{this.busy=false;this.target=u;this.ok('Rôle modifié.');this.refresh()},
   error:e=>{this.busy=false;this.modalError=errorMessage(e)}});
 }
 toggleVerified(){
  this.api.patch<any>(`/api/v1/admin/users/${this.target.id}/verified`,{},{verified:!this.target.verified}).subscribe({
   next:u=>{this.target=u;this.ok('Vérification mise à jour.');this.refresh()},error:e=>this.modalError=errorMessage(e)});
 }
 resetLinkFor(u:any){
  this.target=u;this.link='';this.copied=false;this.modalError='';this.modal='reset';
  this.api.post<any>(`/api/v1/admin/users/${u.id}/reset-link`).subscribe({next:r=>{this.link=r.link;this.resetEmailed=r.emailed},error:e=>this.modalError=errorMessage(e)});
 }
 askDelete(u:any){this.target=u;this.confirmText='';this.modalError='';this.modal='delete'}
 doDelete(){
  this.busy=true;
  this.api.delete(`/api/v1/admin/users/${this.target.id}`).subscribe({
   next:()=>{this.busy=false;this.closeModal();this.ok('Compte supprimé.');this.refresh()},
   error:e=>{this.busy=false;this.modalError=errorMessage(e)}});
 }

 // documents
 kb(n:number){return n>=1048576?(n/1048576).toFixed(1)+' Mo':Math.max(1,Math.round((n||0)/1024))+' Ko'}
 viewDoc(d:any){this.api.openPdf(`/api/v1/documents/${d.id}/file`)}
 review(d:any,status:string,reason?:string){
  this.api.patch<any>(`/api/v1/admin/documents/${d.id}`,{},reason?{status,reason}:{status}).subscribe({
   next:x=>{Object.assign(d,x);this.ok(status==='APPROVED'?'Document approuvé.':'Document refusé : l’enseignant est notifié.');this.refresh();if(this.modal==='reject')this.closeModal();if(this.modal==='teacherDocs')this.loadTeacherDocs()},
   error:e=>{this.modalError=errorMessage(e);this.error=this.modal?'':errorMessage(e)}});
 }
 askReject(d:any){this.target=d;this.reason='';this.modalError='';this.modal='reject'}
 doReject(){this.review(this.target,'REJECTED',this.reason.trim())}
 openTeacherDocs(t:any){this.target=t;this.teacherDocs=[];this.modalError='';this.modal='teacherDocs';this.loadTeacherDocs()}
 loadTeacherDocs(){this.api.get<any[]>(`/api/v1/documents/teacher/${this.target.userId}`).subscribe({next:x=>this.teacherDocs=x,error:e=>this.modalError=errorMessage(e)})}

 // revenue
 bill:any={settings:null,form:{},overview:null,pending:[],active:[],balances:[],payouts:[]};payoutFor:string|null=null;payoutForm:any={};
 planEntries(){return Object.entries(this.bill.overview?.activePlans||{})}
 loadBilling(){
  this.api.get<any>('/api/v1/admin/billing/settings').subscribe({next:x=>{this.bill.settings=x;this.bill.form={...x}},error:e=>this.error=errorMessage(e)});
  this.api.get<any>('/api/v1/admin/billing/overview').subscribe({next:x=>this.bill.overview=x,error:()=>{}});
  this.api.get<Page<any>>('/api/v1/admin/billing/subscriptions',{status:'PENDING',size:50}).subscribe({next:x=>this.bill.pending=x.content,error:()=>{}});
  this.api.get<Page<any>>('/api/v1/admin/billing/subscriptions',{status:'ACTIVE',size:50}).subscribe({next:x=>this.bill.active=x.content.filter((s:any)=>s.activeNow),error:()=>{}});
  this.api.get<any[]>('/api/v1/admin/billing/balances').subscribe({next:x=>this.bill.balances=x,error:()=>{}});
  this.api.get<Page<any>>('/api/v1/admin/billing/payouts',{size:10}).subscribe({next:x=>this.bill.payouts=x.content,error:()=>{}});
 }
 saveSettings(){
  if(this.bill.form.monetizationEnabled&&!this.bill.settings.monetizationEnabled&&!confirm("Activer la monétisation ? Les commissions et les limites de la formule gratuite s'appliqueront immédiatement."))return;
  this.busy=true;
  this.api.put<any>('/api/v1/admin/billing/settings',this.bill.form).subscribe({next:x=>{this.busy=false;this.bill.settings=x;this.bill.form={...x};this.ok('Règles de rémunération enregistrées.');this.loadBilling()},error:e=>{this.busy=false;this.error=errorMessage(e)}});
 }
 subAction(s:any,action:string){
  if(action==='activate'&&!confirm(`Confirmer la réception de ${s.amount} FCFA (réf. ${s.reference}) ? L'abonnement sera actif 30 jours.`))return;
  this.api.patch(`/api/v1/admin/billing/subscriptions/${s.id}`,{},{action}).subscribe({next:()=>{this.ok(action==='activate'?'Abonnement activé.':'Demande annulée.');this.loadBilling()},error:e=>this.error=errorMessage(e)});
 }
 openPayout(b:any){this.payoutFor=b.teacherId;this.payoutForm={method:'ORANGE_MONEY',reference:''}}
 doPayout(b:any){
  this.api.post('/api/v1/admin/billing/payouts',{teacherId:b.teacherId,...this.payoutForm}).subscribe({next:()=>{this.payoutFor=null;this.ok("Versement enregistré : l'enseignant est notifié.");this.loadBilling()},error:e=>this.error=errorMessage(e)});
 }

 // certification
 REPORT_REASONS=REPORT_REASONS;LEVELS=LEVELS;SUBJECTS=SUBJECTS;
 cert:any={settings:null,form:{},overview:null,reports:[],videos:[],suspended:[],questions:{}};
 qf:any={subject:'',level:''};qform:any={};csvText='';importResult:any=null;
 passRate(){const o=this.cert.overview;return o?.attempts?Math.round(o.passed*100/o.attempts):0}
 loadCert(){
  this.resetQuestion();
  this.api.get<any>('/api/v1/admin/certification/settings').subscribe({next:x=>{this.cert.settings=x;this.cert.form={...x}},error:e=>this.error=errorMessage(e)});
  this.api.get<any>('/api/v1/admin/certification/overview').subscribe({next:x=>this.cert.overview=x,error:()=>{}});
  this.api.get<Page<any>>('/api/v1/admin/certification/reports',{status:'OPEN',size:50}).subscribe({next:x=>this.cert.reports=x.content,error:()=>{}});
  this.api.get<any[]>('/api/v1/admin/certification/videos').subscribe({next:x=>this.cert.videos=x,error:()=>{}});
  this.api.get<any[]>('/api/v1/admin/certification/suspended').subscribe({next:x=>this.cert.suspended=x,error:()=>{}});
  if(this.qf.subject)this.loadQuestions(0);
 }
 loadQuestions(page:number){this.api.get<Page<any>>('/api/v1/admin/certification/questions',{...this.qf,page,size:20}).subscribe({next:x=>this.cert.questions=x,error:e=>this.error=errorMessage(e)})}
 resetQuestion(){this.qform={subject:this.qf.subject||'',level:this.qf.level||LEVELS[2],text:'',choices:['','','',''],correctIndex:0}}
 editQuestion(q:any){this.qform={id:q.id,subject:q.subject,level:q.level,text:q.text,choices:[...q.choiceList],correctIndex:q.correctIndex};window.scrollTo({top:document.querySelector('.question-form')!.getBoundingClientRect().top+window.scrollY-120,behavior:'smooth'})}
 saveQuestion(){
  this.busy=true;
  const body={subject:this.qform.subject,level:this.qform.level,text:this.qform.text,choices:this.qform.choices,correctIndex:+this.qform.correctIndex};
  const req=this.qform.id?this.api.put<any>(`/api/v1/admin/certification/questions/${this.qform.id}`,body):this.api.post<any>('/api/v1/admin/certification/questions',body);
  req.subscribe({next:q=>{this.busy=false;this.ok('Question enregistrée.');this.qf={subject:q.subject,level:q.level};this.resetQuestion();this.loadCert()},error:e=>{this.busy=false;this.error=errorMessage(e)}});
 }
 deleteQuestion(q:any){if(!confirm('Retirer cette question de la banque ?'))return;this.api.delete(`/api/v1/admin/certification/questions/${q.id}`).subscribe({next:()=>this.loadCert(),error:e=>this.error=errorMessage(e)})}
 readCsv(ev:Event){
  const f=(ev.target as HTMLInputElement).files?.[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{let t=String(r.result||'');if(t.includes('\uFFFD')){const r2=new FileReader();r2.onload=()=>this.csvText=String(r2.result||'');r2.readAsText(f,'windows-1252');return}this.csvText=t};
  r.readAsText(f,'utf-8');
 }
 downloadTemplate(){
  const csv='matière;niveau;question;réponse 1;réponse 2;réponse 3;réponse 4;bonne réponse\nMathématiques;Lycée (BAC);Combien vaut 7 × 8 ?;54;56;64;48;2\n';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));a.download='modele-questions-profa.csv';a.click();
 }
 importCsv(){
  this.busy=true;this.importResult=null;
  this.api.post<any>('/api/v1/admin/certification/questions/import',{csv:this.csvText}).subscribe({next:r=>{this.busy=false;this.importResult=r;if(r.imported)this.csvText='';this.loadCert()},error:e=>{this.busy=false;this.error=errorMessage(e)}});
 }
 reviewVideo(v:any,status:string){
  let reason:string|null=null;
  if(status==='REJECTED'){reason=prompt('Motif du refus (communiqué à l’enseignant) :');if(!reason)return}
  this.api.patch(`/api/v1/admin/certification/videos/${v.id}`,{},reason?{status,reason}:{status}).subscribe({next:()=>{this.ok(status==='APPROVED'?'Vidéo validée.':'Vidéo refusée.');this.loadCert()},error:e=>this.error=errorMessage(e)});
 }
 resolveReport(r:any,suspend:boolean){
  const resolution=prompt(suspend?'Motif de la suspension (communiqué à l’enseignant) :':'Note de clôture (facultatif) :')??null;
  if(suspend&&!resolution)return;
  this.api.patch(`/api/v1/admin/certification/reports/${r.id}`,{resolution,suspend}).subscribe({next:()=>{this.ok(suspend?'Enseignant suspendu.':'Signalement classé.');this.loadCert()},error:e=>this.error=errorMessage(e)});
 }
 unsuspend(t:any){this.api.patch(`/api/v1/admin/certification/teachers/${t.id}/suspension`,{},{suspended:false}).subscribe({next:()=>{this.ok('Enseignant réactivé.');this.loadCert()},error:e=>this.error=errorMessage(e)})}
 saveCertSettings(){
  this.busy=true;
  this.api.put<any>('/api/v1/admin/certification/settings',this.cert.form).subscribe({next:x=>{this.busy=false;this.cert.settings=x;this.cert.form={...x};this.ok('Règles de certification enregistrées.');this.loadCert()},error:e=>{this.busy=false;this.error=errorMessage(e)}});
 }

 // misc
 closeModal(){
  // Rejecting from the teacher's documents modal returns to it.
  if(this.modal==='reject'&&this.teacherDocs.length&&this.tab==='teachers'){this.modal='teacherDocs';this.target=this.states['teachers']?.items.find(t=>t.userId===this.target.teacherId)||this.target;return}
  this.modal=null;this.teacherDocs=[];
 }
 copy(){navigator.clipboard?.writeText(this.link).then(()=>{this.copied=true;setTimeout(()=>this.copied=false,2000)})}
 whatsapp(){return 'https://wa.me/?text='+encodeURIComponent('Bonjour, voici votre lien Profa pour choisir votre mot de passe (valable 60 minutes) : '+this.link)}
 actionLabel(a:string){return ({USER_CREATE:'Compte créé',USER_UPDATE:'Compte modifié',USER_ENABLE:'Compte activé',USER_BLOCK:'Compte bloqué',USER_VERIFY:'Compte vérifié',USER_UNVERIFY:'Vérification retirée',USER_ROLE:'Rôle modifié',USER_RESET_LINK:'Lien de réinitialisation généré',USER_DELETE:'Compte supprimé',TEACHER_VERIFY:'Enseignant vérifié',TEACHER_UNVERIFY:'Badge retiré',DOCUMENT_APPROVED:'Document approuvé',DOCUMENT_REJECTED:'Document refusé',DOCUMENT_PENDING:'Document remis en attente',JOB_OPEN:'Offre rouverte',JOB_CLOSED:'Offre fermée',JOB_DELETE:'Offre supprimée',REVIEW_DELETE:'Avis supprimé',BOOKING_CANCELLED:'Réservation annulée'} as any)[a]||a}
}
