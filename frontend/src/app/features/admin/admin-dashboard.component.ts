import {Component,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ApiService} from '../../core/api.service';
import {AuthService} from '../../core/auth/auth.service';
import {RouterLink} from '@angular/router';

@Component({
 standalone:true,imports:[CommonModule,RouterLink],
 template:`
 <section class="page admin-page">
   <div class="admin-hero"><div><div class="eyebrow">CENTRE DE CONTRÔLE · PROFA</div><h1>Administration</h1><p>Supervisez la communauté, les profils enseignants et les documents.</p></div><button class="btn ghost" (click)="auth.logout()">Déconnexion</button></div>
   <p class="error" *ngIf="error">{{error}}</p>
   <div class="stats modern-stats" *ngIf="stats"><div><span class="stat-icon">◎</span><small>Utilisateurs</small><strong>{{stats.users}}</strong><span>Comptes inscrits</span></div><div><span class="stat-icon">🎓</span><small>Enseignants</small><strong>{{stats.teachers}}</strong><span>Profils enseignants</span></div><div><span class="stat-icon">◈</span><small>Documents</small><strong>{{stats.pendingDocuments}}</strong><span>En attente de vérification</span></div></div>
   <div class="dash-grid admin-grid">
     <article class="card admin-card"><div class="card-title"><span>🎓</span><div><h3>Enseignants à valider</h3><small>Vérifiez les nouveaux profils</small></div></div><p *ngIf="!pendingTeachers.length" class="empty-inline">Aucun enseignant en attente.</p><div class="admin-list" *ngFor="let teacher of pendingTeachers"><div><strong>{{teacher.headline || 'Profil enseignant'}}</strong><small>{{teacher.city || 'Mali'}} · {{teacher.experienceYears || 0}} an(s) d'expérience</small></div><button class="btn small" (click)="verifyTeacher(teacher.id)">Valider</button></div></article>
     <article class="card admin-card"><div class="card-title"><span>📄</span><div><h3>Documents</h3><small>Suivez les pièces justificatives</small></div></div><p *ngIf="!documents.length" class="empty-inline">Aucun document trouvé.</p><div class="admin-list" *ngFor="let doc of documents"><div><strong>{{doc.type || 'Document'}}</strong><small>{{doc.status}}</small></div><button class="btn small" *ngIf="doc.status === 'PENDING'" (click)="setDocumentStatus(doc.id,'APPROVED')">Approuver</button></div></article>
   </div>
   <div class="card admin-actions"><h3>Accès rapides</h3><a routerLink="/enseignants">🎓 Voir les enseignants</a><a routerLink="/emplois">💼 Voir les offres d'emploi</a></div>
 </section>`
})
export class AdminDashboardComponent {
 api=inject(ApiService);auth=inject(AuthService);stats:any=null;pendingTeachers:any[]=[];documents:any[]=[];error='';
 ngOnInit(){if(this.auth.role()!=='ADMIN'){this.auth.router.navigateByUrl('/dashboard');return}this.load()}
 load(){this.error='';this.api.get<any>('/api/v1/admin/stats').subscribe({next:x=>this.stats=x,error:()=>this.error='Impossible de charger les statistiques ADMIN.'});this.api.get<any[]>('/api/v1/admin/teachers/pending').subscribe({next:x=>this.pendingTeachers=x,error:()=>{}});this.api.get<any[]>('/api/v1/admin/documents').subscribe({next:x=>this.documents=x,error:()=>{}})}
 verifyTeacher(id:string){this.api.patch(`/api/v1/admin/teachers/${id}/verify`).subscribe({next:()=>this.load(),error:()=>this.error='La validation de cet enseignant a échoué.'})}
 setDocumentStatus(id:string,status:string){this.api.patch(`/api/v1/admin/documents/${id}`,{},{status}).subscribe({next:()=>this.load(),error:()=>this.error='La mise à jour du document a échoué.'})}
}