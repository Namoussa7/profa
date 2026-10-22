import {IconComponent} from '../core/icon.component';
import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,Router,RouterLink} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {ApiService,errorMessage} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';
import {LEVELS,MODES,REPORT_REASONS,initials,list,modes,stars} from '../core/labels';

@Component({
 standalone:true,
 imports:[IconComponent,CommonModule,FormsModule,RouterLink],
 template:`
 <section class="page">
   <a routerLink="/enseignants" class="back-link"><app-icon name="back" [size]="16"/>Tous les enseignants</a>
   @if(error){<div class="empty"><span><app-icon name="cap" [size]="28"/></span><h3>{{error}}</h3><a class="btn ghost" routerLink="/enseignants">Retour à la recherche</a></div>}
   @if(t){
   <div class="detail-layout">
     <div class="detail-main">
       <article class="card detail-head">
         <div class="avatar xl">@if(t.avatarUrl){<img [src]="t.avatarUrl" alt="">}@else{<span>{{ini()}}</span>}</div>
         <div>
           <div class="tag-row">@if(t.certified){<span class="badge-cert"><app-icon name="shield" [size]="14"/>Certifié Profa</span>}@if(t.verified){<span class="verified"><app-icon name="check" [size]="14"/>Profil vérifié</span>}@if(t.homeSafe){<span class="badge-home"><app-icon name="home" [size]="14"/>Domicile sécurisé</span>}@if(t.trialLessonFree){<span class="pill gold"><app-icon name="gift" [size]="14"/>1er cours offert</span>}</div>
           <h1>{{t.firstName}} {{t.lastName}}</h1>
           <p class="lead">{{t.headline||'Enseignant Profa'}}</p>
           <div class="rating">@if(t.reviewCount){<span class="stars">{{stars(t.ratingAvg)}}</span> <b>{{t.ratingAvg}}</b> · {{t.reviewCount}} avis}@else{<span class="new-badge">Nouveau sur Profa</span>}<span>· {{t.city||'Mali'}}{{t.district?' — '+t.district:''}}</span></div>
         </div>
       </article>
       @if(t.introVideoUrl){<article class="card"><h3>Vidéo de présentation</h3><a class="text-link" [href]="t.introVideoUrl" target="_blank" rel="noopener">Regarder la vidéo <app-icon name="arrow" [size]="16"/></a></article>}
       <article class="card"><h3>À propos</h3><p class="prewrap">{{t.bio||'Cet enseignant n’a pas encore rédigé sa présentation.'}}</p></article>
       @if(t.certifiedSubjects?.length){<article class="card"><h3>Matières certifiées par Profa</h3><p class="muted small">Test de connaissances réussi sur la plateforme.</p><div class="tag-row">@for(c of t.certifiedSubjects;track c){<span class="pill gold"><app-icon name="check" [size]="14"/>{{c}}</span>}</div></article>}
       <article class="card facts">
         <div><small>Matières</small><div class="tag-row">@for(s of L(t.subjects);track s){<span class="pill">{{s}}</span>}@empty{<span class="muted">Non renseigné</span>}</div></div>
         <div><small>Niveaux</small><div class="tag-row">@for(s of L(t.levels);track s){<span class="pill soft">{{s}}</span>}@empty{<span class="muted">Tous niveaux</span>}</div></div>
         <div><small>Modes de cours</small><div class="tag-row">@for(s of M(t.teachingModes);track s){<span class="pill soft">{{s}}</span>}@empty{<span class="muted">À convenir</span>}</div></div>
         <div><small>Expérience</small><strong>{{t.experienceYears||0}} an(s)</strong></div>
         <div><small>Langues</small><strong>{{t.languages||'Français'}}</strong></div>
         <div><small>Disponibilités</small><strong class="prewrap">{{t.availabilityJson||'À convenir par message'}}</strong></div>
       </article>
       <article class="card">
         <div class="section-row"><h3>Avis des parents et élèves</h3>@if(t.reviewCount){<span class="stars big">{{stars(t.ratingAvg)}} {{t.ratingAvg}}/5</span>}</div>
         @for(r of reviews;track r.id){
           <div class="review"><div class="review-head"><strong>{{r.authorName}}</strong><span class="stars">{{stars(r.rating)}}</span><small>{{r.createdAt | date:'d MMM y'}}</small></div>@if(r.comment){<p>{{r.comment}}</p>}</div>
         } @empty {<p class="empty-inline">Pas encore d’avis. Les avis sont publiés uniquement après un cours terminé.</p>}
       </article>
     </div>

     <aside class="detail-side">
       <div class="card sticky">
         <div class="price"><strong>{{t.hourlyRate||0 | number}} FCFA</strong><span>/ heure</span></div>
         @if(!auth.isLogged()){
           <a class="btn full big" routerLink="/connexion" [queryParams]="{next:'/enseignants/'+t.id}">Réserver un cours</a>
           <a class="btn ghost full" routerLink="/connexion" [queryParams]="{next:'/enseignants/'+t.id}"><app-icon name="message" [size]="18"/>Contacter</a>
           <p class="muted small">Connectez-vous ou créez un compte gratuit pour réserver.</p>
         } @else if(isSelf()){
           <a class="btn ghost full" routerLink="/profil"><app-icon name="edit" [size]="18"/>Modifier mon profil</a>
         } @else {
           @if(auth.role()==='PARENT'){
             <div class="tabs-mini"><button type="button" [class.active]="panel==='book'" (click)="panel='book'">Réserver</button><button type="button" [class.active]="panel==='request'" (click)="panel='request'">Demande</button></div>
             @if(panel==='book'){
               <form class="stack" (ngSubmit)="book()" #bf="ngForm">
                 <label>Date<input type="date" name="date" [(ngModel)]="b.date" [min]="today" required></label>
                 <div class="two"><label>Heure<input type="time" name="time" [(ngModel)]="b.time" required></label>
                 <label>Durée<select name="duration" [(ngModel)]="b.duration"><option [ngValue]="60">1 h</option><option [ngValue]="90">1 h 30</option><option [ngValue]="120">2 h</option><option [ngValue]="180">3 h</option></select></label></div>
                 <label>Mode<select name="mode" [(ngModel)]="b.mode">@for(m of teacherModes();track m){<option [value]="m">{{MODES[m]}}</option>}</select></label>
                 @if(b.mode==='HOME'){<label>Adresse du cours<input name="address" [(ngModel)]="b.address" placeholder="Quartier, rue, repère" required></label>}
                 <p class="total">Total estimé : <strong>{{(t.hourlyRate||0)*b.duration/60 | number:'1.0-0'}} FCFA</strong></p>
                 <button class="btn full" [disabled]="busy||bf.invalid">Réserver ce créneau</button>
               </form>
             } @else {
               <form class="stack" (ngSubmit)="request()">
                 <label>Matière<select name="subject" [(ngModel)]="r.subject" required>@for(s of subjects();track s){<option [value]="s">{{s}}</option>}</select></label>
                 <label>Niveau<select name="level" [(ngModel)]="r.level"><option value="">—</option>@for(l of LEVELS;track l){<option [value]="l">{{l}}</option>}</select></label>
                 <label>Budget (FCFA/h)<input type="number" min="0" name="budget" [(ngModel)]="r.budget"></label>
                 <label>Votre besoin<textarea name="notes" rows="3" [(ngModel)]="r.notes" placeholder="Objectifs, disponibilités, classe de l’élève…"></textarea></label>
                 <button class="btn full" [disabled]="busy||!r.subject">Envoyer la demande</button>
               </form>
             }
           }
           <button type="button" class="btn ghost full" (click)="contact()" [disabled]="busy"><app-icon name="message" [size]="18"/>Envoyer un message</button>
         }
         @if(ok){<p class="success" role="status">{{ok}}</p>}
         @if(actionError){<p class="error" role="alert">{{actionError}}</p>}
         @if(auth.role()==='PARENT'||auth.role()==='SCHOOL'){<button type="button" class="text-link report-link" (click)="reportOpen=true"><app-icon name="help" [size]="14"/> Signaler un problème</button>}
         <ul class="guarantees"><li><app-icon name="check" [size]="16"/>Paiement Mobile Money ou espèces</li><li><app-icon name="check" [size]="16"/>Annulation gratuite avant le cours</li><li><app-icon name="check" [size]="16"/>Avis vérifiés après chaque cours</li></ul>
       </div>
     </aside>
   </div>
   }
 </section>
 @if(reportOpen){
 <div class="modal-backdrop" (click)="reportOpen=false">
   <div class="modal" role="dialog" aria-modal="true" aria-label="Signaler" (click)="$event.stopPropagation()">
     <button class="modal-close" (click)="reportOpen=false" aria-label="Fermer"><app-icon name="x" [size]="18"/></button>
     <h2>Signaler un problème</h2>
     <p class="muted">Votre signalement est confidentiel et examiné par l’équipe Profa. En cas de danger immédiat, contactez les autorités.</p>
     @if(reportDone){<div class="result-panel ok"><app-icon name="check" [size]="22"/><div><strong>Merci</strong><p>{{reportDone}}</p></div></div>}
     @else{
     <form class="stack" (ngSubmit)="sendReport()">
       <label>Motif<select name="reason" [(ngModel)]="report.reason">@for(k of reportKeys;track k){<option [value]="k">{{REPORT_REASONS[k]}}</option>}</select></label>
       <label>Détails<textarea name="details" rows="4" [(ngModel)]="report.details" placeholder="Dates, ce qui s’est passé…"></textarea></label>
       <button class="btn danger full" [disabled]="busy">Envoyer le signalement</button>
     </form>
     }
   </div>
 </div>
 }`
})
export class TeacherDetailComponent implements OnInit{
 api=inject(ApiService);auth=inject(AuthService);route=inject(ActivatedRoute);router=inject(Router);title=inject(Title);
 LEVELS=LEVELS;MODES=MODES;stars=stars;L=list;M=modes;
 t:any=null;reviews:any[]=[];error='';ok='';actionError='';busy=false;panel='book';
 today=new Date().toISOString().slice(0,10);
 b:any={date:'',time:'17:00',duration:60,mode:'ONLINE',address:''};
 r:any={subject:'',level:'',budget:null,notes:''};

 REPORT_REASONS=REPORT_REASONS;reportKeys=Object.keys(REPORT_REASONS);reportOpen=false;reportDone='';report:any={reason:'ABSENCE',details:''};
 sendReport(){
  this.busy=true;
  this.api.post<any>('/api/v1/reports',{teacherId:this.t.userId,...this.report}).subscribe({
   next:r=>{this.busy=false;this.reportDone=r.message},error:e=>{this.busy=false;this.actionError=errorMessage(e);this.reportOpen=false}});
 }
 ngOnInit(){this.route.paramMap.subscribe(p=>this.load(p.get('id')!))}
 load(id:string){
  this.api.get<any>(`/api/v1/teachers/${id}`).subscribe({
   next:t=>{this.t=t;this.title.setTitle(`${t.firstName} ${t.lastName} — ${t.headline||'Enseignant'} — Profa`);
    this.b.mode=this.teacherModes()[0];this.r.subject=this.subjects()[0]||'';this.r.budget=t.hourlyRate;
    this.api.get<any[]>(`/api/v1/reviews/teacher/${t.userId}`).subscribe({next:x=>this.reviews=x,error:()=>{}})},
   error:e=>this.error=e?.status===404?'Ce profil n’existe pas ou n’est plus disponible.':'Impossible de charger ce profil.'
  });
 }
 ini(){return initials(this.t?.firstName,this.t?.lastName)}
 isSelf(){return this.auth.userId()===this.t?.userId}
 subjects(){const s=list(this.t?.subjects);return s.length?s:['Soutien scolaire']}
 teacherModes(){const m=list(this.t?.teachingModes).filter(x=>MODES[x]&&(x!=='HOME'||this.t?.homeSafe));return m.length?m:Object.keys(MODES)}
 private done(msg:string){this.busy=false;this.ok=msg;this.actionError=''}
 private fail(e:any){this.busy=false;this.ok='';this.actionError=errorMessage(e)}
 book(){
  this.busy=true;this.ok='';this.actionError='';
  const start=`${this.b.date}T${this.b.time}:00`;
  const endDate=new Date(`${this.b.date}T${this.b.time}:00`);endDate.setMinutes(endDate.getMinutes()+this.b.duration);
  const pad=(n:number)=>String(n).padStart(2,'0');
  const end=`${endDate.getFullYear()}-${pad(endDate.getMonth()+1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;
  this.api.post('/api/v1/bookings',{teacherId:this.t.userId,startsAt:start,endsAt:end,mode:this.b.mode,address:this.b.mode==='HOME'?this.b.address:null})
   .subscribe({next:()=>this.done('Réservation envoyée. Retrouvez-la dans votre espace pour la payer.'),error:e=>this.fail(e)});
 }
 request(){
  this.busy=true;
  this.api.post('/api/v1/course-requests',{...this.r,teacherId:this.t.userId,city:this.t.city,mode:this.b.mode})
   .subscribe({next:()=>this.done('Demande envoyée. L’enseignant va vous répondre.'),error:e=>this.fail(e)});
 }
 contact(){
  this.busy=true;
  this.api.post<any>('/api/v1/messaging/conversations',{userId:this.t.userId})
   .subscribe({next:c=>{this.busy=false;this.router.navigate(['/messages',c.id])},error:e=>this.fail(e)});
 }
}
