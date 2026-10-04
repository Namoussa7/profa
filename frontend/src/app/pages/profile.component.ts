import {Component,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {ApiService} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';

@Component({
 standalone:true,
 imports:[CommonModule,FormsModule,RouterLink],
 template: `
 <section class="profile-page">
   <div class="profile-head">
     <div>
       <div class="eyebrow">MON PROFIL PROFA</div>
       <h1>Gérez votre <span>profil</span></h1>
       <p>Gardez vos informations à jour pour profiter pleinement de votre espace Profa.</p>
     </div>
     <a routerLink="/dashboard" class="btn ghost">← Mon espace</a>
   </div>

   <div class="profile-layout" *ngIf="profile">
     <aside class="profile-card">
       <div class="avatar">{{initials}}</div>
       <h2>{{profile.firstName}} {{profile.lastName}}</h2>
       <span class="role-badge">{{roleLabel}}</span>
       <div class="verified" [class.pending]="!profile.verified">
         {{profile.verified ? '✓ Profil vérifié' : '○ Vérification en attente'}}
       </div>
       <div class="profile-meta">
         <span>✉ {{profile.email}}</span>
         <span>◉ {{profile.phone || 'Téléphone non renseigné'}}</span>
       </div>
       <button class="logout-btn" (click)="auth.logout()">Déconnexion</button>
     </aside>

     <div class="profile-form-card">
       <div class="card-title">
         <div><h2>Informations personnelles</h2><p>Ces informations servent à vous identifier sur Profa.</p></div>
         <span>✎</span>
       </div>
       <form (ngSubmit)="save()">
         <div class="form-grid">
           <label>Prénom<input [(ngModel)]="form.firstName" name="firstName" required></label>
           <label>Nom<input [(ngModel)]="form.lastName" name="lastName" required></label>
           <label>Téléphone<input [(ngModel)]="form.phone" name="phone" placeholder="+223 XX XX XX XX"></label>
           <label>E-mail<input [value]="profile.email" disabled></label>
         </div>
         <div class="account-info">
           <div><small>TYPE DE COMPTE</small><strong>{{roleLabel}}</strong></div>
           <div><small>STATUT</small><strong>{{profile.enabled ? 'Actif' : 'Bloqué'}}</strong></div>
         </div>
         <div class="save-row">
           <span class="success" *ngIf="message">{{message}}</span>
           <span class="error" *ngIf="error">{{error}}</span>
           <button class="btn" [disabled]="saving">{{saving ? 'Enregistrement…' : 'Enregistrer les modifications →'}}</button>
         </div>
       </form>
     </div>
   </div>
 </section>`
})
export class ProfileComponent {
 api=inject(ApiService); auth=inject(AuthService);
 profile:any=null; form:any={}; saving=false; message=''; error='';
 ngOnInit(){this.load();}
 load(){this.api.get<any>('/api/v1/profile').subscribe({next:p=>{this.profile=p;this.form={firstName:p.firstName,lastName:p.lastName,phone:p.phone||''}},error:()=>this.error='Impossible de charger votre profil.'});}
 get initials(){return ((this.profile?.firstName?.[0]||'')+(this.profile?.lastName?.[0]||'')).toUpperCase();}
 get roleLabel(){return ({TEACHER:'Enseignant',SCHOOL:'École',PARENT:'Parent / Étudiant',ADMIN:'Administrateur'} as any)[this.profile?.role]||this.profile?.role||'Membre';}
 save(){this.saving=true;this.message='';this.error='';this.api.patch<any>('/api/v1/profile',this.form).subscribe({next:p=>{this.profile=p;this.form={firstName:p.firstName,lastName:p.lastName,phone:p.phone||''};this.saving=false;this.message='Profil mis à jour avec succès.'},error:()=>{this.saving=false;this.error='La mise à jour a échoué. Réessayez.'}});}
}