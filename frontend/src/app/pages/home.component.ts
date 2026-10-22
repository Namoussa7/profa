import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {ApiService} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';
import {IconComponent} from '../core/icon.component';
import {CITIES,SUBJECTS,initials,list,stars} from '../core/labels';

@Component({
 standalone:true,
 imports:[CommonModule,FormsModule,RouterLink,IconComponent],
 template:`
 <section class="hero-band">
  <div class="hero">
   <div class="hero-copy">
     <div class="eyebrow">Mali · Afrique de l’Ouest</div>
     <h1>Le bon enseignant, <span>au bon moment.</span></h1>
     <p>Des enseignants vérifiés près de chez vous ou en ligne. Réservez en quelques clics et payez en Mobile Money.</p>
     <form class="hero-search" (ngSubmit)="search()" role="search">
       <label class="field"><app-icon name="book" [size]="18"/><input name="subject" [(ngModel)]="subject" list="home-subjects" placeholder="Quelle matière ?" aria-label="Matière"></label>
       <datalist id="home-subjects">@for(s of SUBJECTS;track s){<option [value]="s"></option>}</datalist>
       <label class="field"><app-icon name="pin" [size]="18"/><input name="city" [(ngModel)]="city" list="home-cities" placeholder="Ville ou quartier" aria-label="Ville"></label>
       <datalist id="home-cities">@for(c of CITIES;track c){<option [value]="c"></option>}</datalist>
       <button class="btn big accent"><app-icon name="search" [size]="18"/>Rechercher</button>
     </form>
     <div class="chips">@for(s of popular;track s){<a class="chip" [routerLink]="['/enseignants']" [queryParams]="{subject:s}">{{s}}</a>}</div>
     <div class="trust"><span><app-icon name="shield" [size]="18"/>Diplômes vérifiés</span><span><app-icon name="star" [size]="18"/>Avis après cours réels</span><span><app-icon name="home" [size]="18"/>À domicile ou en ligne</span></div>
   </div>
   <div class="hero-visual">
     <div class="hero-glow"></div>
     <div class="hero-card">
       <div class="hero-card-top"><span class="mini-icon"><app-icon name="sparkle"/></span><div><small>PROFA</small><strong>Que souhaitez-vous faire ?</strong></div></div>
       <a routerLink="/enseignants"><b><app-icon name="cap"/></b><div><strong>Prendre des cours</strong><small>À domicile, chez l’enseignant ou en ligne</small></div><i><app-icon name="arrow" [size]="18"/></i></a>
       @if(auth.role()!=='PARENT'){       <a routerLink="/emplois"><b><app-icon name="school"/></b><div><strong>Recruter un enseignant</strong><small>Publiez vos offres, suivez vos candidats</small></div><i><app-icon name="arrow" [size]="18"/></i></a>}
       <a routerLink="/inscription" [queryParams]="{role:'TEACHER'}"><b><app-icon name="users"/></b><div><strong>Devenir enseignant</strong><small>Fixez vos tarifs, trouvez des élèves</small></div><i><app-icon name="arrow" [size]="18"/></i></a>
     </div>
     <div class="floating-card"><span><app-icon name="shield"/></span><div><strong>Profils contrôlés</strong><small>Documents vérifiés par Profa</small></div></div>
     <div class="floating-card second"><span><app-icon name="wallet"/></span><div><strong>Mobile Money</strong><small>Orange · Moov · Wave</small></div></div>
   </div>
  </div>
 </section>

 <section class="value-strip"><div>
   <article><span class="v-ic"><app-icon name="search"/></span><div><strong>Recherche précise</strong><small>Matière, niveau, ville, tarif</small></div></article>
   <article><span class="v-ic"><app-icon name="calendar"/></span><div><strong>Réservation en ligne</strong><small>Prix calculé automatiquement</small></div></article>
   <article><span class="v-ic"><app-icon name="wallet"/></span><div><strong>Paiement simple</strong><small>Mobile Money ou espèces</small></div></article>
   <article><span class="v-ic"><app-icon name="message"/></span><div><strong>Messagerie intégrée</strong><small>Échangez avant de réserver</small></div></article>
 </div></section>

 <section class="section-intro"><div><div class="eyebrow">Matières populaires</div><h2>Que voulez-vous <span>apprendre ?</span></h2></div><a routerLink="/enseignants" class="btn ghost">Toutes les matières <app-icon name="arrow" [size]="16"/></a></section>
 <section class="subject-tiles">
   @for(t of tiles;track t.name){<a class="subject-tile" [routerLink]="['/enseignants']" [queryParams]="{subject:t.name}"><span class="t-ic"><app-icon [name]="t.icon"/></span><div><strong>{{t.name}}</strong><br><small>{{t.hint}}</small></div></a>}
 </section>

 @if(featured.length){
 <section class="section-intro"><div><div class="eyebrow">Enseignants à la une</div><h2>Ils font progresser <span>leurs élèves.</span></h2></div><a routerLink="/enseignants" class="btn ghost">Voir tous les enseignants <app-icon name="arrow" [size]="16"/></a></section>
 <section class="grid featured-grid">
   @for(t of featured;track t.id){
     <a class="teacher modern-card" [routerLink]="['/enseignants',t.id]">
       <div class="card-top"><div class="avatar">@if(t.avatarUrl){<img [src]="t.avatarUrl" alt="">}@else{<span>{{ini(t)}}</span>}</div>@if(t.verified){<span class="verified"><app-icon name="check" [size]="14"/>Vérifié</span>}</div>
       <h3>{{t.firstName}} {{t.lastName}}</h3>
       <p class="teacher-role">{{t.headline||'Enseignant Profa'}}</p>
       <div class="rating">@if(t.reviewCount){<span class="stars">{{stars(t.ratingAvg)}}</span><b>{{t.ratingAvg}}</b><span>({{t.reviewCount}} avis)</span>}@else{<span class="new-badge">Nouveau</span>}</div>
       <div class="tag-row">@for(s of subj(t).slice(0,3);track s){<span class="pill">{{s}}</span>}</div>
       <div class="card-bottom"><div><small>À partir de</small><strong>{{t.hourlyRate||0 | number}} FCFA <em>/ h</em></strong></div><span class="btn small ghost">Voir le profil</span></div>
     </a>
   }
 </section>
 }

 <section class="section-intro"><div><div class="eyebrow">Comment ça marche</div><h2>Trois étapes, <span>zéro complication.</span></h2></div><p>Le parcours des meilleures plateformes mondiales, adapté au Mali : Mobile Money, cours à domicile, échanges directs.</p></section>
 <section class="features">
   <div class="feature-card"><span class="feature-number">01</span><div class="feature-icon"><app-icon name="search" [size]="24"/></div><h3>Cherchez</h3><p>Filtrez par matière, niveau, ville, mode de cours, tarif et note des autres parents.</p><a routerLink="/enseignants">Explorer les profils <app-icon name="arrow" [size]="16"/></a></div>
   <div class="feature-card featured"><span class="feature-number">02</span><div class="feature-icon"><app-icon name="calendar" [size]="24"/></div><h3>Échangez & réservez</h3><p>Écrivez à l’enseignant, envoyez une demande ou choisissez directement un créneau.</p><a routerLink="/comment-ca-marche">En savoir plus <app-icon name="arrow" [size]="16"/></a></div>
   <div class="feature-card"><span class="feature-number">03</span><div class="feature-icon"><app-icon name="star" [size]="24"/></div><h3>Progressez & notez</h3><p>Payez en Orange Money, Moov, Wave ou en espèces, puis laissez un avis vérifié.</p><a routerLink="/inscription">Commencer <app-icon name="arrow" [size]="16"/></a></div>
 </section>

 <section class="home-cta"><div><div class="eyebrow">Vous êtes une école ?</div><h2>Publiez vos offres et suivez<br>vos candidatures en un clic.</h2></div><a routerLink="/inscription" [queryParams]="{role:'SCHOOL'}" class="btn light big">Créer un compte école <app-icon name="arrow" [size]="18"/></a></section>`
})
export class HomeComponent implements OnInit{
 api=inject(ApiService);router=inject(Router);auth=inject(AuthService);
 SUBJECTS=SUBJECTS;CITIES=CITIES;stars=stars;
 popular=['Mathématiques','Français','Anglais','Physique-Chimie','Préparation BAC'];
 tiles=[
  {name:'Mathématiques',icon:'chart',hint:'Du fondamental au BAC'},
  {name:'Français',icon:'book',hint:'Expression, grammaire'},
  {name:'Anglais',icon:'globe',hint:'Scolaire & conversation'},
  {name:'Physique-Chimie',icon:'sparkle',hint:'Exercices & méthode'},
  {name:'Informatique',icon:'grid',hint:'Bureautique, code'},
  {name:'Préparation BAC',icon:'cap',hint:'Révisions intensives'},
 ];
 subject='';city='';featured:any[]=[];
 ngOnInit(){this.api.get<any>('/api/v1/teachers',{sort:'relevance',size:3}).subscribe({next:x=>this.featured=(x?.content||[]).slice(0,3),error:()=>{}})}
 search(){this.router.navigate(['/enseignants'],{queryParams:{subject:this.subject||null,city:this.city||null}})}
 ini(t:any){return initials(t.firstName,t.lastName)}
 subj(t:any){return list(t.subjects)}
}
