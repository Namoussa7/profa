import {IconComponent} from '../core/icon.component';
import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {ApiService,errorMessage} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';
import {CITIES,LEVELS,MODES,SUBJECTS,initials,list} from '../core/labels';

@Component({
 standalone:true,
 imports:[IconComponent,CommonModule,FormsModule,RouterLink],
 template: `
 <section class="profile-page">
   <div class="profile-head">
     <div>
       <div class="eyebrow">MON PROFIL PROFA</div>
       <h1>Gérez votre <span>profil</span></h1>
       <p>Gardez vos informations à jour pour profiter pleinement de votre espace Profa.</p>
     </div>
     <div class="dash-actions">@if(teacher){<a [routerLink]="['/enseignants',teacher.id]" class="btn ghost"><app-icon name="eye" [size]="18"/>Voir mon profil public</a>}<a [routerLink]="auth.home()" class="btn ghost"><app-icon name="back" [size]="18"/>Mon espace</a></div>
   </div>
   @if(onboarding){<p class="notice"><app-icon name="sparkle" [size]="18"/> Bienvenue ! Complétez votre profil {{profile?.role==='SCHOOL'?'d’établissement':'enseignant'}} ci-dessous pour être visible.</p>}
   @if(error){<p class="error" role="alert">{{error}}</p>}

   @if(profile){
   <div class="profile-layout">
     <aside class="profile-card">
       <div class="avatar" [class.logo-frame]="!!school?.logoUrl">@if(teacher?.avatarUrl){<img [src]="teacher.avatarUrl" alt="Photo de profil">}@else if(school?.logoUrl){<img [src]="school.logoUrl" alt="Logo de l’établissement">}@else{<span>{{ini()}}</span>}</div>
       <h2>{{profile.firstName}} {{profile.lastName}}</h2>
       <span class="role-badge">{{roleLabel}}</span>
       <div class="verified" [class.pending]="!verified()">{{verified() ? 'Profil vérifié' : 'Vérification en attente'}}</div>
       <div class="profile-meta"><span><app-icon name="message" [size]="16"/>{{profile.email}}</span><span><app-icon name="phone" [size]="16"/>{{profile.phone || 'Téléphone non renseigné'}}</span></div>
       <button class="logout-btn" (click)="auth.logout()"><app-icon name="logout" [size]="18"/>Déconnexion</button>
     </aside>

     <div class="profile-stack">
       <div class="profile-form-card">
         <div class="card-title"><div><h2>Informations personnelles</h2><p>Ces informations servent à vous identifier sur Profa.</p></div><span><app-icon name="edit"/></span></div>
         <form (ngSubmit)="save()">
           <div class="form-grid">
             <label>Prénom<input [(ngModel)]="form.firstName" name="firstName" required></label>
             <label>Nom<input [(ngModel)]="form.lastName" name="lastName" required></label>
             <label>Téléphone / WhatsApp<input [(ngModel)]="form.phone" name="phone" type="tel" placeholder="+223 XX XX XX XX"></label>
             <label>E-mail<input [value]="profile.email" disabled></label>
           </div>
           <div class="save-row"><span class="success" *ngIf="message.user">{{message.user}}</span><button class="btn" [disabled]="saving">{{saving ? 'Enregistrement…' : 'Enregistrer'}}</button></div>
         </form>
       </div>

       @if(teacher){
       <div class="profile-form-card">
         <div class="card-title"><div><h2>Profil enseignant public</h2><p>C’est ce que voient les parents dans la recherche.</p></div><span><app-icon name="cap"/></span></div>
         <form (ngSubmit)="saveTeacher()">
           <div class="form-grid">
             <label class="full">Titre accrocheur<input name="headline" [(ngModel)]="teacher.headline" maxlength="120" placeholder="Professeur de maths certifié — préparation DEF & BAC"></label>
             <label class="full">Présentation<textarea name="bio" rows="5" [(ngModel)]="teacher.bio" maxlength="5000" placeholder="Votre parcours, votre méthode, vos résultats…"></textarea></label>
             <fieldset class="full"><legend>Matières enseignées</legend><div class="chip-select">@for(s of SUBJECTS;track s){<button type="button" class="chip" [class.on]="has('subjects',s)" (click)="toggle('subjects',s)">{{s}}</button>}</div></fieldset>
             <fieldset class="full"><legend>Niveaux</legend><div class="chip-select">@for(l of LEVELS;track l){<button type="button" class="chip" [class.on]="has('levels',l)" (click)="toggle('levels',l)">{{l}}</button>}</div></fieldset>
             <fieldset class="full"><legend>Modes de cours</legend><div class="chip-select">@for(m of modeKeys;track m){<button type="button" class="chip" [class.on]="has('teachingModes',m)" (click)="toggle('teachingModes',m)">{{MODES[m]}}</button>}</div></fieldset>
             <label>Tarif horaire (FCFA)<input type="number" min="0" step="500" name="hourlyRate" [(ngModel)]="teacher.hourlyRate"></label>
             <label>Années d’expérience<input type="number" min="0" max="70" name="experienceYears" [(ngModel)]="teacher.experienceYears"></label>
             <label>Ville<input name="city" list="p-cities" [(ngModel)]="teacher.city"></label>
             <datalist id="p-cities">@for(c of CITIES;track c){<option [value]="c"></option>}</datalist>
             <label>Quartier<input name="district" [(ngModel)]="teacher.district" placeholder="ex. ACI 2000"></label>
             <label>Langues parlées<input name="languages" [(ngModel)]="teacher.languages" placeholder="Français, Bambara, Anglais"></label>
             <label>Salaire souhaité (écoles, FCFA/mois)<input type="number" min="0" name="salaryExpectation" [(ngModel)]="teacher.salaryExpectation"></label>
             <label class="full">Disponibilités<textarea name="availability" rows="2" [(ngModel)]="teacher.availabilityJson" placeholder="Lun–Ven 17h–20h, samedi matin"></textarea></label>
             <label>Photo de profil (lien URL)<input type="url" name="avatarUrl" [(ngModel)]="teacher.avatarUrl" placeholder="https://…/photo.jpg"><small class="muted">Aperçu immédiat dans la carte de gauche.</small></label>
             <label>Vidéo de présentation (lien)<input type="url" name="introVideoUrl" [(ngModel)]="teacher.introVideoUrl" placeholder="YouTube, TikTok…"></label>
             <label class="check full"><input type="checkbox" name="trial" [(ngModel)]="teacher.trialLessonFree"> Je propose le premier cours d’essai gratuit</label>
           </div>
           <p class="muted small">Adresse exacte : partagée uniquement avec les parents ayant réservé.</p>
           <div class="save-row"><span class="success" *ngIf="message.teacher">{{message.teacher}}</span><button class="btn" [disabled]="saving">Enregistrer le profil enseignant</button></div>
         </form>
       </div>
       }

       @if(school){
       <div class="profile-form-card">
         <div class="card-title"><div><h2>Fiche établissement</h2><p>Affichée sur vos offres d’emploi.</p></div><span><app-icon name="school"/></span></div>
         <form (ngSubmit)="saveSchool()">
           <div class="form-grid">
             <label class="full">Nom de l’établissement<input name="name" [(ngModel)]="school.name" required></label>
             <label>Ville<input name="city" list="s-cities" [(ngModel)]="school.city"></label>
             <datalist id="s-cities">@for(c of CITIES;track c){<option [value]="c"></option>}</datalist>
             <label>Quartier<input name="district" [(ngModel)]="school.district"></label>
             <label class="full">Adresse<input name="address" [(ngModel)]="school.address"></label>
             <label>Téléphone<input name="phone" type="tel" [(ngModel)]="school.phone"></label>
             <label>Site web<input name="website" type="url" [(ngModel)]="school.website" placeholder="https://"></label>
             <label>Logo de l’établissement (lien URL)<input name="logoUrl" type="url" [(ngModel)]="school.logoUrl" placeholder="https://…/logo.png"><small class="muted">Aperçu immédiat dans la carte de gauche. Format carré conseillé.</small></label>
             <label>Nombre d’employés<input name="employeeCount" type="number" min="0" [(ngModel)]="school.employeeCount"></label>
             <label class="full">Présentation<textarea name="description" rows="4" [(ngModel)]="school.description"></textarea></label>
           </div>
           <div class="save-row"><span class="success" *ngIf="message.school">{{message.school}}</span><button class="btn" [disabled]="saving">Enregistrer la fiche</button></div>
         </form>
       </div>
       }
     </div>
   </div>
   }
 </section>`
})
export class ProfileComponent implements OnInit{
 api=inject(ApiService);auth=inject(AuthService);route=inject(ActivatedRoute);
 SUBJECTS=SUBJECTS;LEVELS=LEVELS;CITIES=CITIES;MODES=MODES;modeKeys=Object.keys(MODES);
 profile:any=null;form:any={};teacher:any=null;school:any=null;saving=false;message:any={};error='';
 onboarding=!!this.route.snapshot.queryParamMap.get('onboarding');

 ngOnInit(){
  this.api.get<any>('/api/v1/profile').subscribe({next:p=>{
   this.profile=p;this.form={firstName:p.firstName,lastName:p.lastName,phone:p.phone||''};
   if(p.role==='TEACHER')this.api.get<any>('/api/v1/teachers/me').subscribe({next:t=>this.teacher=t,error:()=>{}});
   if(p.role==='SCHOOL')this.api.get<any>('/api/v1/schools/me').subscribe({next:s=>this.school=s,error:()=>{}});
  },error:()=>this.error='Impossible de charger votre profil.'});
 }
 ini(){return initials(this.profile?.firstName,this.profile?.lastName)}
 verified(){return this.teacher?this.teacher.verified:this.profile?.verified}
 get roleLabel(){return ({TEACHER:'Enseignant',SCHOOL:'École',PARENT:'Parent / Étudiant',ADMIN:'Administrateur'} as any)[this.profile?.role]||this.profile?.role||'Membre'}
 has(field:string,v:string){return list(this.teacher?.[field]).includes(v)}
 toggle(field:string,v:string){const l=list(this.teacher[field]);this.teacher[field]=(l.includes(v)?l.filter(x=>x!==v):[...l,v]).join(',')}
 private flash(key:string,msg:string){this.saving=false;this.error='';this.message={[key]:msg};setTimeout(()=>this.message={},4000)}
 private fail(e:any){this.saving=false;this.error=errorMessage(e,'La mise à jour a échoué. Réessayez.')}
 save(){this.saving=true;this.api.patch<any>('/api/v1/profile',this.form).subscribe({next:p=>{this.profile=p;this.auth.updateNames(p.firstName,p.lastName);this.flash('user','Profil mis à jour.')},error:e=>this.fail(e)})}
 saveTeacher(){this.saving=true;this.api.put<any>('/api/v1/teachers/me',this.teacher).subscribe({next:t=>{this.teacher=t;this.flash('teacher','Profil enseignant enregistré.')},error:e=>this.fail(e)})}
 saveSchool(){this.saving=true;this.api.put<any>('/api/v1/schools/me',this.school).subscribe({next:s=>{this.school=s;this.flash('school','Fiche établissement enregistrée.')},error:e=>this.fail(e)})}
}
