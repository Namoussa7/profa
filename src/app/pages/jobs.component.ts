import {IconComponent} from '../core/icon.component';
import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {ApiService,errorMessage} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';
import {CITIES,CONTRACTS,LEVELS,SUBJECTS} from '../core/labels';

@Component({
 standalone:true,
 imports:[IconComponent,CommonModule,FormsModule,RouterLink],
 template:`
 <section class="page">
   <div class="page-hero">
     <div><div class="eyebrow">CARRIÈRE B2B</div><h1>Les opportunités commencent ici.</h1><p>Découvrez les besoins des établissements et construisez votre prochaine étape professionnelle.</p></div>
     <div class="result-badge"><app-icon name="briefcase" [size]="16"/> <strong>{{jobs.length}}</strong> offre(s)</div>
   </div>
   <div class="jobs-banner"><div><span><app-icon name="school" [size]="22"/></span><div><strong>Vous êtes une école ?</strong><small>Publiez vos besoins et recevez des candidatures structurées.</small></div></div><button class="btn ghost" (click)="startPublish()">Publier une offre</button></div>
   <form class="search-panel jobs-search" (ngSubmit)="load()" role="search">
     <label class="field"><app-icon name="search" [size]="18"/><input name="q" [(ngModel)]="f.q" placeholder="Mot-clé, poste…" aria-label="Mot-clé"></label>
     <label class="field"><app-icon name="book" [size]="18"/><input name="subject" [(ngModel)]="f.subject" list="j-subjects" placeholder="Matière" aria-label="Matière"></label>
     <datalist id="j-subjects">@for(s of SUBJECTS;track s){<option [value]="s"></option>}</datalist>
     <label class="field"><app-icon name="pin" [size]="18"/><input name="city" [(ngModel)]="f.city" list="j-cities" placeholder="Ville" aria-label="Ville"></label>
     <datalist id="j-cities">@for(c of CITIES;track c){<option [value]="c"></option>}</datalist>
     <select name="contractType" [(ngModel)]="f.contractType" aria-label="Contrat"><option value="">Tous contrats</option>@for(c of CONTRACTS;track c){<option [value]="c">{{c}}</option>}</select>
     <button class="btn">Rechercher</button>
   </form>
   @if(error){<p class="error" role="alert">{{error}}</p>}
   <div class="grid jobs-grid">
     @for(j of jobs;track j.id){
       <article class="job modern-card">
         <div class="job-head"><span class="pill">{{j.contractType||'Enseignement'}}</span><span class="job-city">{{j.city||'Mali'}}</span></div>
         <h3>{{j.title}}</h3><p class="job-meta">{{j.schoolName||'Établissement'}} · {{j.subject||'Matière'}} · {{j.level||'Tous niveaux'}}</p>
         <p class="bio">{{(j.description||'Une opportunité d’enseignement au sein d’un établissement partenaire Profa.') | slice:0:150}}</p>
         <div class="card-bottom"><div><small>Rémunération</small><strong>@if(j.salaryMin||j.salaryMax){<span>{{j.salaryMin||0 | number}} – {{j.salaryMax||0 | number}} FCFA</span>}@else{<span>À négocier</span>}</strong></div><button class="btn small" (click)="open(j)">Consulter</button></div>
       </article>
     } @empty { <div class="empty"><span><app-icon name="briefcase" [size]="28"/></span><h3>Aucune offre ouverte</h3><p>Les nouvelles opportunités apparaîtront ici.</p></div> }
   </div>
 </section>

 @if(selected){
 <div class="modal-backdrop" (click)="close()">
   <div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="selected.title" (click)="$event.stopPropagation()">
     <button class="modal-close" (click)="close()" aria-label="Fermer"><app-icon name="x" [size]="18"/></button>
     <span class="pill">{{selected.contractType||'Enseignement'}}</span>
     <h2>{{selected.title}}</h2>
     <p class="job-meta">{{selected.schoolName}} · {{selected.city||'Mali'}} · {{selected.subject||'—'}} · {{selected.level||'Tous niveaux'}}</p>
     <p><strong>Salaire :</strong> @if(selected.salaryMin||selected.salaryMax){<span>{{selected.salaryMin||0 | number}} – {{selected.salaryMax||0 | number}} FCFA / mois</span>}@else{<span>À négocier</span>}</p>
     <p class="prewrap">{{selected.description||'Aucune description détaillée.'}}</p>
     @if(!auth.isLogged()){
       <a class="btn full" routerLink="/connexion" [queryParams]="{next:'/emplois'}">Se connecter pour postuler</a>
     } @else if(auth.role()==='TEACHER'){
       @if(applied){<p class="success">Candidature envoyée. Suivez-la depuis votre espace.</p>}
       @else{
         <form class="stack" (ngSubmit)="apply()">
           <label>Lettre de motivation <span class="optional">(recommandé)</span><textarea name="cover" rows="5" [(ngModel)]="cover" placeholder="Présentez votre expérience, vos diplômes et votre motivation…"></textarea></label>
           <button class="btn full" [disabled]="busy">Postuler à cette offre</button>
         </form>
       }
     } @else {<p class="muted">Seuls les comptes enseignants peuvent postuler.</p>}
     @if(modalError){<p class="error" role="alert">{{modalError}}</p>}
   </div>
 </div>
 }

 @if(publishing){
 <div class="modal-backdrop" (click)="publishing=false">
   <div class="modal" role="dialog" aria-modal="true" aria-label="Publier une offre" (click)="$event.stopPropagation()">
     <button class="modal-close" (click)="publishing=false" aria-label="Fermer"><app-icon name="x" [size]="18"/></button>
     <h2>Publier une offre</h2>
     <form class="stack" (ngSubmit)="publish()" #pf="ngForm">
       <label>Intitulé du poste<input name="title" [(ngModel)]="job.title" required placeholder="Professeur de mathématiques — Lycée"></label>
       <div class="two"><label>Matière<input name="subject" [(ngModel)]="job.subject" list="j-subjects"></label><label>Niveau<select name="level" [(ngModel)]="job.level"><option value="">—</option>@for(l of LEVELS;track l){<option [value]="l">{{l}}</option>}</select></label></div>
       <div class="two"><label>Ville<input name="city" [(ngModel)]="job.city" list="j-cities"></label><label>Contrat<select name="contractType" [(ngModel)]="job.contractType">@for(c of CONTRACTS;track c){<option [value]="c">{{c}}</option>}</select></label></div>
       <div class="two"><label>Salaire min (FCFA)<input type="number" min="0" name="salaryMin" [(ngModel)]="job.salaryMin"></label><label>Salaire max (FCFA)<input type="number" min="0" name="salaryMax" [(ngModel)]="job.salaryMax"></label></div>
       <label>Description<textarea name="description" rows="5" [(ngModel)]="job.description" placeholder="Missions, profil recherché, horaires, avantages…"></textarea></label>
       <button class="btn full" [disabled]="busy||pf.invalid">Publier</button>
     </form>
     @if(modalError){<p class="error" role="alert">{{modalError}}</p>}
   </div>
 </div>
 }`
})
export class JobsComponent implements OnInit{
 api=inject(ApiService);auth=inject(AuthService);router=inject(Router);
 SUBJECTS=SUBJECTS;CITIES=CITIES;CONTRACTS=CONTRACTS;LEVELS=LEVELS;
 jobs:any[]=[];error='';f:any={q:'',subject:'',city:'',contractType:''};
 selected:any=null;cover='';applied=false;busy=false;modalError='';
 publishing=false;job:any={contractType:'CDI'};

 ngOnInit(){this.load()}
 load(){this.api.get<any[]>('/api/v1/jobs',this.f).subscribe({next:x=>this.jobs=x,error:()=>this.error='Impossible de charger les offres.'})}
 open(j:any){this.selected=j;this.cover='';this.applied=false;this.modalError=''}
 close(){this.selected=null}
 apply(){
  this.busy=true;this.modalError='';
  this.api.post(`/api/v1/jobs/${this.selected.id}/apply`,{coverLetter:this.cover}).subscribe({next:()=>{this.applied=true;this.busy=false},error:e=>{this.modalError=errorMessage(e);this.busy=false}});
 }
 startPublish(){
  if(!this.auth.isLogged()){this.router.navigate(['/inscription'],{queryParams:{role:'SCHOOL'}});return}
  if(this.auth.role()!=='SCHOOL'){this.error='La publication d’offres est réservée aux comptes école.';return}
  this.job={contractType:'CDI'};this.modalError='';this.publishing=true;
 }
 publish(){
  this.busy=true;this.modalError='';
  this.api.post('/api/v1/jobs',this.job).subscribe({next:()=>{this.busy=false;this.publishing=false;this.load()},error:e=>{this.modalError=errorMessage(e);this.busy=false}});
 }
}
