import {Component,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ApiService} from '../../core/api.service';
import {AuthService} from '../../core/auth/auth.service';

@Component({
 standalone:true,
 imports:[CommonModule,FormsModule],
 template:`
 <section class="page admin-page">
   <div class="admin-hero">
     <div>
       <div class="eyebrow">CENTRE DE CONTRÔLE · PROFA</div>
       <h1>Administration</h1>
       <p>Pilotez les comptes, validations, écoles, recrutements, cours et paiements depuis un seul espace.</p>
     </div>
     <button class="btn ghost" (click)="auth.logout()">Déconnexion</button>
   </div>

   <p class="error" *ngIf="error">{{error}}</p>

   <div class="stats modern-stats" *ngIf="stats">
     <div><span class="stat-icon">◎</span><small>Utilisateurs</small><strong>{{stats.users}}</strong><span>{{stats.activeUsers}} actifs</span></div>
     <div><span class="stat-icon">🎓</span><small>Enseignants</small><strong>{{stats.teachers}}</strong><span>{{stats.pendingTeachers}} à valider</span></div>
     <div><span class="stat-icon">🏫</span><small>Écoles</small><strong>{{stats.schools}}</strong><span>Établissements</span></div>
     <div><span class="stat-icon">💼</span><small>Recrutement</small><strong>{{stats.jobs}}</strong><span>{{stats.openJobs}} offres ouvertes</span></div>
     <div><span class="stat-icon">📄</span><small>Documents</small><strong>{{stats.pendingDocuments}}</strong><span>En attente</span></div>
     <div><span class="stat-icon">💳</span><small>Paiements</small><strong>{{stats.pendingPayments}}</strong><span>En attente</span></div>
   </div>

   <div class="admin-tabs">
     <button [class.active]="tab==='overview'" (click)="tab='overview'">Vue générale</button>
     <button [class.active]="tab==='users'" (click)="tab='users';loadUsers()">Utilisateurs</button>
     <button [class.active]="tab==='teachers'" (click)="tab='teachers';loadTeachers()">Enseignants</button>
     <button [class.active]="tab==='schools'" (click)="tab='schools';loadSchools()">Écoles</button>
     <button [class.active]="tab==='jobs'" (click)="tab='jobs';loadJobs()">Recrutement</button>
     <button [class.active]="tab==='documents'" (click)="tab='documents';loadDocuments()">Documents</button>
     <button [class.active]="tab==='payments'" (click)="tab='payments';loadPayments()">Paiements</button>
   </div>

   <ng-container *ngIf="tab==='overview'">
     <div class="dash-grid admin-grid">
       <article class="card admin-card">
         <div class="card-title"><span>🎓</span><div><h3>Enseignants à valider</h3><small>Contrôle des nouveaux profils</small></div></div>
         <p *ngIf="!pendingTeachers.length" class="empty-inline">Aucun enseignant en attente.</p>
         <div class="admin-list" *ngFor="let teacher of pendingTeachers">
           <div><strong>{{teacher.headline || 'Profil enseignant'}}</strong><small>{{teacher.city || 'Mali'}} · {{teacher.experienceYears || 0}} an(s)</small></div>
           <button class="btn small" (click)="verifyTeacher(teacher.id)">Valider</button>
         </div>
       </article>
       <article class="card admin-card">
         <div class="card-title"><span>📄</span><div><h3>Documents à contrôler</h3><small>Diplômes et pièces justificatives</small></div></div>
         <p *ngIf="!documents.length" class="empty-inline">Aucun document.</p>
         <div class="admin-list" *ngFor="let doc of documents">
           <div><strong>{{doc.type || 'Document'}}</strong><small>{{doc.status}}</small></div>
           <div class="row-actions" *ngIf="doc.status === 'PENDING'"><button class="btn small" (click)="setDocumentStatus(doc.id,'APPROVED')">Approuver</button><button class="btn small danger" (click)="setDocumentStatus(doc.id,'REJECTED')">Refuser</button></div>
         </div>
       </article>
     </div>
     <div class="card admin-actions">
       <h3>Indicateurs opérationnels</h3>
       <div class="admin-kpis" *ngIf="stats">
         <div><span>Demandes de cours</span><strong>{{stats.courseRequestsPending}}</strong><small>en attente</small></div>
         <div><span>Réservations</span><strong>{{stats.pendingBookings}}</strong><small>à traiter</small></div>
         <div><span>Candidatures</span><strong>{{stats.applications}}</strong><small>total</small></div>
         <div><span>Avis</span><strong>{{stats.reviews}}</strong><small>publiés</small></div>
       </div>
     </div>
   </ng-container>

   <ng-container *ngIf="tab==='users'">
     <div class="card admin-table-card"><div class="section-row"><div><h3>Comptes utilisateurs</h3><small>Activation et vérification des comptes</small></div><input class="admin-search" [(ngModel)]="search" placeholder="Rechercher…"></div>
       <div class="admin-table"><div class="admin-table-head"><span>Utilisateur</span><span>Rôle</span><span>Statut</span><span>Actions</span></div>
         <div class="admin-table-row" *ngFor="let u of filteredUsers()"><span><strong>{{u.firstName}} {{u.lastName}}</strong><small>{{u.email}}</small></span><span class="pill">{{u.role}}</span><span>{{u.enabled?'Actif':'Bloqué'}} · {{u.verified?'Vérifié':'Non vérifié'}}</span><span class="row-actions"><button class="btn small" (click)="toggleUser(u)">{{u.enabled?'Bloquer':'Activer'}}</button><button class="btn small ghost" (click)="verifyUser(u)">{{u.verified?'Retirer vérif.':'Vérifier'}}</button></span></div>
       </div>
     </div>
   </ng-container>

   <ng-container *ngIf="tab==='teachers'"><div class="card admin-table-card"><h3>Enseignants</h3><div class="admin-table"><div class="admin-table-row" *ngFor="let t of teachers"><span><strong>{{t.headline||'Profil sans titre'}}</strong><small>{{t.city||'Mali'}} · {{t.experienceYears||0}} an(s)</small></span><span>{{t.hourlyRate||0}} FCFA/h</span><span>{{t.verified?'Vérifié':'À vérifier'}}</span><button class="btn small" *ngIf="!t.verified" (click)="verifyTeacher(t.id)">Valider</button></div></div></div></ng-container>

   <ng-container *ngIf="tab==='schools'"><div class="card admin-table-card"><h3>Écoles et établissements</h3><div class="admin-table"><div class="admin-table-row" *ngFor="let s of schools"><span><strong>{{s.name||'École sans nom'}}</strong><small>{{s.city||'Mali'}} · {{s.address||'Adresse non renseignée'}}</small></span><span>{{s.employeeCount||0}} employés</span><span>{{s.phone||'—'}}</span></div></div></div></ng-container>

   <ng-container *ngIf="tab==='jobs'"><div class="card admin-table-card"><h3>Offres de recrutement</h3><div class="admin-table"><div class="admin-table-row" *ngFor="let j of jobs"><span><strong>{{j.title}}</strong><small>{{j.subject||'—'}} · {{j.level||'—'}} · {{j.city||'Mali'}}</small></span><span>{{j.status}}</span><span>{{j.salaryMin||0}} – {{j.salaryMax||0}} FCFA</span><span class="row-actions"><button class="btn small" (click)="setJobStatus(j.id,j.status==='OPEN'?'CLOSED':'OPEN')">{{j.status==='OPEN'?'Fermer':'Ouvrir'}}</button></span></div></div></div></ng-container>

   <ng-container *ngIf="tab==='documents'"><div class="card admin-table-card"><h3>Pièces justificatives</h3><div class="admin-table"><div class="admin-table-row" *ngFor="let d of documents"><span><strong>{{d.type||'Document'}}</strong><small>{{d.fileUrl||'Fichier non renseigné'}}</small></span><span>{{d.status}}</span><span class="row-actions" *ngIf="d.status==='PENDING'"><button class="btn small" (click)="setDocumentStatus(d.id,'APPROVED')">Approuver</button><button class="btn small danger" (click)="setDocumentStatus(d.id,'REJECTED')">Refuser</button></span></div></div></div></ng-container>

   <ng-container *ngIf="tab==='payments'"><div class="card admin-table-card"><h3>Paiements</h3><div class="admin-table"><div class="admin-table-row" *ngFor="let p of payments"><span><strong>{{p.amount||0 | number}} {{p.currency||'XOF'}}</strong><small>{{p.provider||'—'}} · {{p.method||'—'}}</small></span><span>{{p.status}}</span><span>{{p.externalReference||'—'}}</span><button class="btn small" *ngIf="p.status==='PENDING'" (click)="setPaymentStatus(p.id,'CONFIRMED')">Confirmer</button></div></div></div></ng-container>
 </section>`,
})
export class AdminDashboardComponent {
 api=inject(ApiService);
 auth=inject(AuthService);
 stats:any=null; pendingTeachers:any[]=[]; documents:any[]=[]; users:any[]=[]; teachers:any[]=[]; schools:any[]=[]; jobs:any[]=[]; payments:any[]=[];
 error=''; tab='overview'; search='';

 ngOnInit(){if(this.auth.role()!=='ADMIN'){this.auth.router.navigateByUrl('/dashboard');return}this.load()}

 load(){
   this.error='';
   this.api.get<any>('/api/v1/admin/stats').subscribe({next:x=>this.stats=x,error:()=>this.error='Impossible de charger les statistiques ADMIN.'});
   this.loadTeachers(); this.loadDocuments();
 }
 loadUsers(){this.api.get<any[]>('/api/v1/admin/users').subscribe({next:x=>this.users=x,error:()=>this.error='Impossible de charger les utilisateurs.'})}
 loadTeachers(){this.api.get<any[]>('/api/v1/admin/teachers').subscribe({next:x=>{this.teachers=x;this.pendingTeachers=x.filter(t=>!t.verified)},error:()=>this.error='Impossible de charger les enseignants.'})}
 loadSchools(){this.api.get<any[]>('/api/v1/admin/schools').subscribe({next:x=>this.schools=x,error:()=>this.error='Impossible de charger les écoles.'})}
 loadJobs(){this.api.get<any[]>('/api/v1/admin/jobs').subscribe({next:x=>this.jobs=x,error:()=>this.error='Impossible de charger les offres.'})}
 loadDocuments(){this.api.get<any[]>('/api/v1/admin/documents').subscribe({next:x=>this.documents=x,error:()=>{}})}
 loadPayments(){this.api.get<any[]>('/api/v1/admin/payments').subscribe({next:x=>this.payments=x,error:()=>this.error='Impossible de charger les paiements.'})}
 filteredUsers(){const q=this.search.trim().toLowerCase();return q?this.users.filter(u=>((u.firstName||'')+' '+(u.lastName||'')+' '+(u.email||'')).toLowerCase().includes(q)):this.users}
 verifyTeacher(id:string){this.api.patch(`/api/v1/admin/teachers/${id}/verify`,{}).subscribe({next:()=>this.loadTeachers(),error:()=>this.error='La validation de cet enseignant a échoué.'})}
 setDocumentStatus(id:string,status:string){this.api.patch(`/api/v1/admin/documents/${id}`,{},{status}).subscribe({next:()=>this.loadDocuments(),error:()=>this.error='La mise à jour du document a échoué.'})}
 toggleUser(u:any){this.api.patch(`/api/v1/admin/users/${u.id}/enabled`,{},{enabled:!u.enabled}).subscribe({next:()=>this.loadUsers(),error:()=>this.error='La modification du compte a échoué.'})}
 verifyUser(u:any){this.api.patch(`/api/v1/admin/users/${u.id}/verified`,{},{verified:!u.verified}).subscribe({next:()=>this.loadUsers(),error:()=>this.error='La vérification a échoué.'})}
 setJobStatus(id:string,status:string){this.api.patch(`/api/v1/admin/jobs/${id}/status`,{},{status}).subscribe({next:()=>this.loadJobs(),error:()=>this.error='La modification de l’offre a échoué.'})}
 setPaymentStatus(id:string,status:string){this.api.patch(`/api/v1/admin/payments/${id}/status`,{},{status}).subscribe({next:()=>this.loadPayments(),error:()=>this.error='La mise à jour du paiement a échoué.'})}
}