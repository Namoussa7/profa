import {IconComponent} from '../core/icon.component';
import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,Router,RouterLink} from '@angular/router';
import {ApiService} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';
import {CITIES,LEVELS,MODES,SUBJECTS,initials,list,modes,stars} from '../core/labels';

@Component({
 standalone:true,
 imports:[IconComponent,CommonModule,FormsModule,RouterLink],
 template:`
 <section class="page">
   <div class="page-hero">
     <div><div class="eyebrow">MARKETPLACE B2C</div><h1>Trouvez votre enseignant.</h1><p>Comparez les profils, les tarifs et les avis des parents. À domicile, chez l’enseignant ou en ligne.</p></div>
     <div class="result-badge"><app-icon name="users" [size]="16"/> <strong>{{total}}</strong> profil(s)</div>
   </div>
   <form class="search-panel big-search" (ngSubmit)="apply()" role="search">
     <label class="field"><app-icon name="book" [size]="18"/><input name="subject" [(ngModel)]="f.subject" (ngModelChange)="typed()" list="t-subjects" placeholder="Matière" aria-label="Matière"></label>
     <datalist id="t-subjects">@for(s of SUBJECTS;track s){<option [value]="s"></option>}</datalist>
     <label class="field"><app-icon name="pin" [size]="18"/><input name="city" [(ngModel)]="f.city" (ngModelChange)="typed()" list="t-cities" placeholder="Ville ou quartier" aria-label="Ville"></label>
     <datalist id="t-cities">@for(c of CITIES;track c){<option [value]="c"></option>}</datalist>
     <label class="field"><app-icon name="wallet" [size]="18"/><input name="maxRate" type="number" (ngModelChange)="typed()" min="0" step="500" [(ngModel)]="f.maxRate" placeholder="Tarif max (FCFA/h)" aria-label="Tarif maximum"></label>
     <button class="btn"><app-icon name="search" [size]="18"/>Rechercher</button>
   </form>
   <div class="filters">
     <select [(ngModel)]="f.level" (ngModelChange)="apply()" aria-label="Niveau"><option value="">Tous niveaux</option>@for(l of LEVELS;track l){<option [value]="l">{{l}}</option>}</select>
     <select [(ngModel)]="f.mode" (ngModelChange)="apply()" aria-label="Mode de cours"><option value="">Tous les modes</option>@for(m of modeKeys;track m){<option [value]="m">{{MODES[m]}}</option>}</select>
     <label class="toggle"><input type="checkbox" [(ngModel)]="f.certified" (ngModelChange)="apply()"> Certifiés Profa</label>
     <label class="toggle"><input type="checkbox" [(ngModel)]="f.verified" (ngModelChange)="apply()"> Vérifiés uniquement</label>
     <label class="toggle"><input type="checkbox" [(ngModel)]="f.trial" (ngModelChange)="apply()"> 1er cours offert</label>
     <select class="sort" [(ngModel)]="f.sort" (ngModelChange)="apply()" aria-label="Trier par"><option value="relevance">Pertinence</option><option value="rating">Mieux notés</option><option value="price_asc">Prix croissant</option><option value="price_desc">Prix décroissant</option><option value="experience">Plus d’expérience</option></select>
     @if(active()){<button type="button" class="text-link" (click)="reset()">Effacer les filtres</button>}
   </div>
   @if(error){<p class="error" role="alert">{{error}}</p>}
   <div class="grid teacher-grid" [class.loading]="loading">
     @for(t of teachers;track t.id){
       <article class="teacher modern-card">
         <div class="card-top">
           <a class="avatar" [routerLink]="['/enseignants',t.id]">@if(t.avatarUrl){<img [src]="t.avatarUrl" alt="">}@else{<span>{{ini(t)}}</span>}</a>
           <div class="card-flags">@if(t.certified){<span class="badge-cert"><app-icon name="shield" [size]="14"/>Certifié Profa</span>}@else if(t.verified){<span class="verified"><app-icon name="check" [size]="14"/>Vérifié</span>}@if(t.homeSafe){<span class="badge-home" title="Casier judiciaire vérifié"><app-icon name="home" [size]="14"/></span>}<button type="button" class="fav" [class.on]="favs.has(t.userId)" (click)="toggleFav(t)" [attr.aria-label]="favs.has(t.userId)?'Retirer des favoris':'Ajouter aux favoris'"><app-icon name="heart" [size]="17"/></button></div>
         </div>
         <a [routerLink]="['/enseignants',t.id]"><h3>{{t.firstName}} {{t.lastName}}</h3></a>
         <p class="teacher-role">{{t.headline||'Enseignant Profa'}}</p>
         <div class="rating">@if(t.reviewCount){<span class="stars">{{stars(t.ratingAvg)}}</span><b>{{t.ratingAvg}}</b><span>({{t.reviewCount}} avis)</span>}@else{<span class="new-badge">Nouveau</span>}<span>· {{t.city||'Mali'}} · {{t.experienceYears||0}} an(s) d’exp.</span></div>
         <p class="bio">{{(t.bio||'Profil pédagogique disponible pour cours à domicile ou à distance.') | slice:0:140}}{{(t.bio||'').length>140?'…':''}}</p>
         <div class="tag-row">@for(s of subj(t).slice(0,3);track s){<span class="pill">{{s}}</span>}@for(m of md(t);track m){<span class="pill soft">{{m}}</span>}@if(t.trialLessonFree){<span class="pill gold">1er cours offert</span>}</div>
         <div class="card-bottom"><div><small>Tarif</small><strong>{{t.hourlyRate||0 | number}} FCFA <em>/ h</em></strong></div><a class="btn small" [routerLink]="['/enseignants',t.id]">Voir le profil</a></div>
       </article>
     } @empty {
       @if(!loading){<div class="empty"><span><app-icon name="cap" [size]="28"/></span><h3>Aucun profil trouvé</h3><p>Essayez une autre ville, un autre niveau ou augmentez votre tarif maximum.</p>@if(active()){<button class="btn ghost" (click)="reset()">Effacer les filtres</button>}</div>}
     }
     @if(loading&&!teachers.length){@for(i of [1,2,3,4,5,6];track i){<div class="modern-card skeleton"></div>}}
   </div>
   @if(page+1<totalPages){<div class="load-more"><button class="btn ghost big" (click)="more()" [disabled]="loading">{{loading?'Chargement…':'Afficher plus d’enseignants'}}</button><small>{{teachers.length}} sur {{total}}</small></div>}
 </section>`
})
export class TeachersComponent implements OnInit{
 api=inject(ApiService);auth=inject(AuthService);route=inject(ActivatedRoute);router=inject(Router);
 SUBJECTS=SUBJECTS;CITIES=CITIES;LEVELS=LEVELS;MODES=MODES;modeKeys=Object.keys(MODES);stars=stars;
 teachers:any[]=[];favs=new Set<string>();loading=false;error='';page=0;total=0;totalPages=0;
 private debounce:any;private seq=0;
 f:any={subject:'',city:'',level:'',mode:'',maxRate:null,verified:false,certified:false,trial:false,sort:'relevance'};

 ngOnInit(){
  this.route.queryParamMap.subscribe(q=>{
   this.f={subject:q.get('subject')||'',city:q.get('city')||'',level:q.get('level')||'',mode:q.get('mode')||'',maxRate:q.get('maxRate')?+q.get('maxRate')!:null,verified:q.get('verified')==='true',certified:q.get('certified')==='true',trial:q.get('trial')==='true',sort:q.get('sort')||'relevance'};
   this.load();
  });
  if(this.auth.isLogged())this.api.get<string[]>('/api/v1/favorites').subscribe({next:x=>this.favs=new Set(x),error:()=>{}});
 }
 /** Filters live in the URL so a search can be shared or bookmarked. */
 apply(){const f=this.f;this.router.navigate([],{queryParams:{subject:f.subject||null,city:f.city||null,level:f.level||null,mode:f.mode||null,maxRate:f.maxRate||null,verified:f.verified||null,certified:f.certified||null,trial:f.trial||null,sort:f.sort!=='relevance'?f.sort:null}})}
 reset(){this.router.navigate([],{queryParams:{}})}
 active(){const f=this.f;return !!(f.subject||f.city||f.level||f.mode||f.maxRate||f.verified||f.certified||f.trial)}
 /** Search while typing (300 ms pause) without spamming the API. */
 typed(){clearTimeout(this.debounce);this.debounce=setTimeout(()=>this.apply(),350)}
 load(append=false){
  if(!append)this.page=0;
  const mine=++this.seq;this.loading=true;this.error='';
  this.api.get<any>('/api/v1/teachers',{...this.f,page:this.page,size:12}).subscribe({
   next:x=>{if(mine!==this.seq)return;this.teachers=append?[...this.teachers,...x.content]:x.content;this.total=x.totalElements;this.totalPages=x.totalPages;this.loading=false},
   error:()=>{if(mine!==this.seq)return;this.error='Impossible de charger les enseignants. Réessayez dans un instant.';this.loading=false}});
 }
 more(){this.page++;this.load(true)}
 toggleFav(t:any){
  if(!this.auth.isLogged()){this.router.navigate(['/connexion'],{queryParams:{next:this.router.url}});return}
  const on=this.favs.has(t.userId);
  (on?this.api.delete<any>(`/api/v1/favorites/${t.userId}`):this.api.post<any>(`/api/v1/favorites/${t.userId}`)).subscribe({next:()=>{on?this.favs.delete(t.userId):this.favs.add(t.userId)},error:()=>{}});
 }
 ini(t:any){return initials(t.firstName,t.lastName)}
 subj(t:any){return list(t.subjects)}
 md(t:any){return modes(t.teachingModes)}
}
