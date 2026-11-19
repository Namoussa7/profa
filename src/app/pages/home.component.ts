import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {ApiService} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';
import {IconComponent} from '../core/icon.component';
import {RingComponent} from '../core/ring.component';
import {CountUpDirective} from '../core/count-up.directive';
import {CITIES,SUBJECTS,initials,list,stars} from '../core/labels';

/** Subjects shown as gauges: share of Profa teachers who teach them. */
const GAUGES=[
 {name:'Mathématiques',icon:'chart',color:'#f5a524',hint:'Du fondamental au BAC'},
 {name:'Français',icon:'book',color:'#3b5bfd',hint:'Expression, grammaire'},
 {name:'Anglais',icon:'globe',color:'#12b886',hint:'Scolaire & conversation'},
];

@Component({
 standalone:true,
 imports:[CommonModule,FormsModule,RouterLink,IconComponent,RingComponent,CountUpDirective],
 template:`
 <div class="page home-v35">
  <div class="hello-head">
   <div>
    <span class="hello-chip"><i class="live"></i>Mali · Afrique de l’Ouest · enseignants vérifiés</span>
    <h1 class="hello">Le bon enseignant,<br><span class="serif">au bon moment</span></h1>
    <p class="hello-sub">Des enseignants vérifiés près de chez vous ou en ligne. Réservez en quelques clics et payez en Mobile Money.</p>
   </div>
   <div class="dash-actions">
    @if(!auth.isLogged()){<a class="pill dark" routerLink="/inscription"><app-icon name="sparkle" [size]="16"/>Créer un compte</a>}
    @else{<a class="pill dark" [routerLink]="auth.home()"><app-icon name="grid" [size]="16"/>Mon espace</a>}
    <a class="pill" routerLink="/comment-ca-marche"><app-icon name="help" [size]="16"/>Comment ça marche</a>
   </div>
  </div>

  <form class="glass-search" (ngSubmit)="search()" role="search">
   <label class="field"><app-icon name="book" [size]="18"/><input name="subject" [(ngModel)]="subject" list="home-subjects" placeholder="Quelle matière ?" aria-label="Matière"></label>
   <datalist id="home-subjects">@for(s of SUBJECTS;track s){<option [value]="s"></option>}</datalist>
   <label class="field"><app-icon name="pin" [size]="18"/><input name="city" [(ngModel)]="city" list="home-cities" placeholder="Ville ou quartier" aria-label="Ville"></label>
   <datalist id="home-cities">@for(c of CITIES;track c){<option [value]="c"></option>}</datalist>
   <button class="btn"><app-icon name="search" [size]="18"/>Rechercher</button>
  </form>
  <div class="chips glass-chips">@for(s of popular;track s){<a class="pill" [routerLink]="['/enseignants']" [queryParams]="{subject:s}">{{s}}</a>}</div>

  <div class="v35-grid">
   <div class="v35-main">
    <div class="kpi-row">
     <div class="kpi"><div class="kpi-top"><span class="kpi-ic"><app-icon name="cap" [size]="18"/></span><small>Enseignants inscrits</small></div>
      <div class="kpi-num"><strong [countUp]="total"></strong></div><span class="kpi-hint">Profils publiés sur Profa</span></div>
     <div class="kpi"><div class="kpi-top"><span class="kpi-ic"><app-icon name="book" [size]="18"/></span><small>Matières</small></div>
      <div class="kpi-num"><strong [countUp]="SUBJECTS.length"></strong></div><span class="kpi-hint">Du fondamental au BAC</span></div>
     <div class="kpi"><div class="kpi-top"><span class="kpi-ic"><app-icon name="pin" [size]="18"/></span><small>Villes</small></div>
      <div class="kpi-num"><strong [countUp]="CITIES.length"></strong></div><span class="kpi-hint">Bamako, Ségou, Sikasso…</span></div>
    </div>

    <h2 class="glance">Les matières <span class="serif">en un coup d’œil</span></h2>
    <div class="ring-row">
     @for(g of gauges;track g.name){
      <article class="ring-card">
       <div class="ring-card-head"><span class="kpi-ic"><app-icon [name]="g.icon" [size]="18"/></span><div><strong>{{g.name}}</strong><small>{{g.hint}}</small></div></div>
       <div class="ring-card-body"><app-ring [value]="share(g.name)" [color]="g.color" [label]="'Part des enseignants en '+g.name" caption="des profs"/>
        <ul><li><span>Enseignants</span><b>{{counts[g.name]??'—'}}</b></li><li><span>Niveaux</span><b>Tous</b></li></ul></div>
       <a class="text-link" [routerLink]="['/enseignants']" [queryParams]="{subject:g.name}">Voir les enseignants <app-icon name="arrow" [size]="14"/></a>
      </article>
     }
    </div>

    <h2 class="glance">Toutes les matières</h2>
    <div class="tile-grid">
     @for(t of tiles;track t.name){<a class="subject-tile" [routerLink]="['/enseignants']" [queryParams]="{subject:t.name}"><span class="t-ic"><app-icon [name]="t.icon"/></span><div><strong>{{t.name}}</strong><br><small>{{t.hint}}</small></div></a>}
    </div>
   </div>

   <aside class="v35-side">
    <article class="monitor">
     <div class="monitor-head"><strong>Que souhaitez-vous faire ?</strong><span class="monitor-chip">Profa</span></div>
     <a class="monitor-action" routerLink="/enseignants"><span><app-icon name="cap" [size]="18"/></span><div><strong>Prendre des cours</strong><small>À domicile, chez l’enseignant ou en ligne</small></div><app-icon name="arrow" [size]="16"/></a>
     @if(auth.role()!=='PARENT'){<a class="monitor-action" routerLink="/emplois"><span><app-icon name="school" [size]="18"/></span><div><strong>Recruter un enseignant</strong><small>Publiez vos offres, suivez vos candidats</small></div><app-icon name="arrow" [size]="16"/></a>}
     <a class="monitor-action" routerLink="/inscription" [queryParams]="{role:'TEACHER'}"><span><app-icon name="users" [size]="18"/></span><div><strong>Devenir enseignant</strong><small>Fixez vos tarifs, trouvez des élèves</small></div><app-icon name="arrow" [size]="16"/></a>
     <div class="monitor-kpis"><div><small>Mobile Money</small><strong>3<em>opérateurs</em></strong></div><div><small>Modes de cours</small><strong>3<em>modes</em></strong></div></div>
     <a class="monitor-cta" routerLink="/enseignants">Trouver un enseignant<app-icon name="arrow" [size]="15"/></a>
    </article>
    <article class="card people">
     <div class="section-row"><h3>Enseignants à la une</h3><span class="live-chip"><i class="live"></i>{{featured.length}}</span></div>
     @for(t of featured;track t.id){
      <a class="person" [routerLink]="['/enseignants',t.id]"><span class="avatar">{{ini(t)}}</span><span><b>{{t.firstName}} {{t.lastName}}</b><small>{{subj(t).slice(0,2).join(' · ')||t.headline||'Enseignant Profa'}}</small></span>@if(t.verified){<em class="ok">Vérifié</em>}@else if(t.reviewCount){<em>{{t.ratingAvg}} ★</em>}</a>
     } @empty {<p class="empty-inline">Les premiers profils vérifiés apparaîtront ici.</p>}
    </article>
   </aside>
  </div>

  <h2 class="glance">Trois étapes, <span class="serif">zéro complication</span></h2>
  <div class="ring-row home-steps">
   @for(s of steps;track s.title;let i=$index){
    <article class="ring-card">
     <div class="ring-card-head"><span class="kpi-ic"><app-icon [name]="s.icon" [size]="18"/></span><div><strong>{{s.title}}</strong><small>Étape {{i+1}} sur 3</small></div></div>
     <p class="step-text">{{s.text}}</p>
     <a class="text-link" [routerLink]="s.link">{{s.cta}} <app-icon name="arrow" [size]="14"/></a>
    </article>
   }
  </div>

  <section class="cta-glass">
   <div><span class="hello-chip"><i class="live"></i>Vous êtes une école ?</span><h2>Publiez vos offres et suivez vos candidatures <span class="serif">en un clic</span></h2></div>
   <a routerLink="/inscription" [queryParams]="{role:'SCHOOL'}" class="pill dark">Créer un compte école <app-icon name="arrow" [size]="16"/></a>
  </section>
 </div>`
})
export class HomeComponent implements OnInit{
 api=inject(ApiService);router=inject(Router);auth=inject(AuthService);
 SUBJECTS=SUBJECTS;CITIES=CITIES;stars=stars;gauges=GAUGES;
 popular=['Mathématiques','Français','Anglais','Physique-Chimie','Préparation BAC'];
 tiles=[
  {name:'Mathématiques',icon:'chart',hint:'Du fondamental au BAC'},
  {name:'Français',icon:'book',hint:'Expression, grammaire'},
  {name:'Anglais',icon:'globe',hint:'Scolaire & conversation'},
  {name:'Physique-Chimie',icon:'sparkle',hint:'Exercices & méthode'},
  {name:'Informatique',icon:'grid',hint:'Bureautique, code'},
  {name:'Préparation BAC',icon:'cap',hint:'Révisions intensives'},
 ];
 steps=[
  {title:'Cherchez',icon:'search',text:'Filtrez par matière, niveau, ville, mode de cours, tarif et note des autres parents.',link:'/enseignants',cta:'Explorer les profils'},
  {title:'Échangez & réservez',icon:'calendar',text:'Écrivez à l’enseignant, envoyez une demande ou choisissez directement un créneau.',link:'/comment-ca-marche',cta:'En savoir plus'},
  {title:'Progressez & notez',icon:'star',text:'Payez en Orange Money, Moov, Wave ou en espèces, puis laissez un avis vérifié.',link:'/inscription',cta:'Commencer'},
 ];
 subject='';city='';featured:any[]=[];total=0;counts:{[k:string]:number}={};
 ngOnInit(){
  this.api.get<any>('/api/v1/teachers',{sort:'relevance',size:4}).subscribe({next:x=>{this.featured=(x?.content||[]).slice(0,4);this.total=x?.totalElements??this.featured.length},error:()=>{}});
  for(const g of GAUGES)this.api.get<any>('/api/v1/teachers',{subject:g.name,size:1}).subscribe({next:x=>this.counts={...this.counts,[g.name]:x?.totalElements??0},error:()=>{}});
 }
 /** Share (%) of all teachers who teach this subject. */
 share(name:string){const n=this.counts[name];return this.total&&n!=null?n/this.total*100:0}
 search(){this.router.navigate(['/enseignants'],{queryParams:{subject:this.subject||null,city:this.city||null}})}
 ini(t:any){return initials(t.firstName,t.lastName)}
 subj(t:any){return list(t.subjects)}
}
