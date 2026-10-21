import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {ApiService,Page,errorMessage} from '../../core/api.service';
import {AuthService} from '../../core/auth/auth.service';
import {IconComponent} from '../../core/icon.component';
import {DOC_TYPES,ROLES,STATUS,label,statusClass} from '../../core/labels';

type Tab='overview'|'users'|'teachers'|'documents'|'schools'|'jobs'|'bookings'|'payments'|'reviews'|'audit';
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

   <!-- ============ LIST TABS ============ -->
   @if(tab!=='overview'){
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
  {id:'overview',label:'Vue générale',icon:'grid'},{id:'users',label:'Utilisateurs',icon:'users'},{id:'teachers',label:'Enseignants',icon:'cap'},
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
 go(t:Tab){this.tab=t;this.error='';if(t==='overview')this.loadStats();else this.load(0)}
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
