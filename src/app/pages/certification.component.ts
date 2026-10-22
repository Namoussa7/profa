import {Component,inject,OnDestroy,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {ApiService,errorMessage} from '../core/api.service';
import {IconComponent} from '../core/icon.component';

@Component({
 standalone:true,
 imports:[CommonModule,FormsModule,RouterLink,IconComponent],
 template:`
 <section class="page">
   <a routerLink="/dashboard" class="back-link"><app-icon name="back" [size]="16"/>Mon espace</a>

   @if(attempt){
   <!-- ============ TEST EN COURS ============ -->
   <div class="quiz-head card">
     <div><div class="eyebrow">Test de certification</div><h2>{{attempt.subject}} · {{attempt.level}}</h2>
       <p class="muted">{{answered()}} / {{attempt.questions.length}} réponses · note minimale {{status?.passScore}} %</p></div>
     <div class="timer" [class.urgent]="remaining<120"><app-icon name="clock" [size]="20"/>{{clock()}}</div>
   </div>
   <div class="progress quiz-progress"><span [style.width.%]="answered()*100/attempt.questions.length"></span></div>
   @for(q of attempt.questions;track q.id;let i=$index){
     <article class="card quiz-q">
       <p class="q-text"><b>{{i+1}}.</b> {{q.text}}</p>
       <div class="q-choices" role="radiogroup">
         @for(c of q.choices;track $index;let j=$index){
           <label class="q-choice" [class.on]="answers[q.id]===j"><input type="radio" [name]="q.id" [value]="j" [(ngModel)]="answers[q.id]"><span>{{c}}</span></label>
         }
       </div>
     </article>
   }
   <div class="quiz-actions"><button class="btn big" [disabled]="busy" (click)="submit()">{{busy?'Envoi…':'Terminer et envoyer'}} <app-icon name="send" [size]="18"/></button>
     <small class="muted">Le test est envoyé automatiquement à la fin du temps imparti.</small></div>
   } @else {

   <div class="page-hero"><div><div class="eyebrow">Certification enseignant</div><h1>Devenez « Certifié Profa »</h1>
     <p>Les parents choisissent en priorité les enseignants certifiés. Suivez ces étapes pour obtenir le badge.</p></div>
     @if(status?.certified){<span class="badge-cert big"><app-icon name="shield" [size]="20"/>Certifié Profa</span>}</div>

   @if(error){<p class="error" role="alert">{{error}}</p>}
   @if(result){
     <div class="result-panel" [class.ok]="result.passed" [class.ko]="!result.passed"><app-icon [name]="result.passed?'check':'x'" [size]="22"/>
       <div><strong>{{result.passed?'Test réussi':'Test non réussi'}} : {{result.score}} %</strong>
         <p>{{result.correct}} bonne(s) réponse(s) sur {{result.total}} · note minimale {{result.passScore}} %.
           @if(result.late){<span> Temps dépassé.</span>}
           @if(result.passed){<span> La matière est ajoutée à votre profil comme certifiée.</span>}
           @else if(result.retryAt){<span> Nouvel essai possible le {{result.retryAt|date:'d MMM y'}}.</span>}
           @else{<span> Vous pouvez retenter le test.</span>}</p></div></div>
   }
   @if(status?.suspended){<div class="result-panel ko"><app-icon name="lock" [size]="22"/><div><strong>Profil suspendu</strong><p>{{status.suspendedReason}}. Contactez l’équipe Profa.</p></div></div>}

   @if(status){
   <article class="card block">
     <div class="section-row"><h3><span class="h-ic"><app-icon name="shield" [size]="18"/></span>Votre parcours</h3><small>{{doneSteps()}} / {{status.steps.length}} étapes</small></div>
     <ol class="cert-steps">
       @for(s of status.steps;track s.key){
         <li [class.done]="s.done"><span class="dot-step"><app-icon [name]="s.done?'check':'clock'" [size]="16"/></span>
           <div><strong>{{s.label}}</strong><small>{{s.detail}}</small></div>
           @if(!s.done){
             @if(s.key==='DOCUMENTS'||s.key==='RECORD'){<a class="btn small ghost" routerLink="/dashboard">Envoyer</a>}
             @if(s.key==='VIDEO'){<a class="btn small ghost" routerLink="/profil">Ajouter la vidéo</a>}
           }
         </li>
       }
     </ol>
   </article>

   <article class="card block">
     <div class="section-row"><div><h3><span class="h-ic"><app-icon name="book" [size]="18"/></span>Tests de connaissances</h3>
       <small>{{status.questionCount}} questions tirées au hasard · {{status.durationMinutes}} minutes · réussite à {{status.passScore}} %</small></div></div>
     @for(c of status.catalog;track c.subject+c.level){
       <div class="row-item">
         <div class="row-main"><strong>{{c.subject}} · {{c.level}}</strong>
           <small>@if(c.passed){<span>Certifié avec {{c.score}} %</span>}@else if(c.retryAt){<span>{{c.failedRecently}}/{{c.maxAttempts}} tentatives utilisées · nouvel essai le {{c.retryAt|date:'d MMM y'}}</span>}@else{<span>{{c.failedRecently}}/{{c.maxAttempts}} tentative(s) utilisée(s)</span>}</small></div>
         <div class="row-tags">@if(c.passed){<span class="status ok">Réussi</span>}</div>
         <div class="row-actions">@if(!c.passed&&!c.retryAt){<button class="btn small" [disabled]="busy||status.suspended" (click)="start(c)">{{c.openAttemptId?'Reprendre le test':'Passer le test'}}</button>}</div>
       </div>
     } @empty {<p class="empty-inline">Aucun test n’est encore disponible. L’équipe Profa prépare les questions par matière.</p>}
     <p class="muted small">Conseil : installez-vous au calme. Une fois commencé, le chronomètre tourne même si vous quittez la page.</p>
   </article>
   }
   }
 </section>`
})
export class CertificationComponent implements OnInit,OnDestroy{
 api=inject(ApiService);
 status:any=null;attempt:any=null;answers:{[k:string]:number}={};result:any=null;error='';busy=false;remaining=0;
 private timer:any;

 ngOnInit(){this.load()}
 ngOnDestroy(){clearInterval(this.timer)}
 load(){this.api.get<any>('/api/v1/certification/status').subscribe({next:x=>this.status=x,error:e=>this.error=errorMessage(e)})}
 doneSteps(){return (this.status?.steps||[]).filter((s:any)=>s.done).length}
 answered(){return Object.keys(this.answers).length}
 clock(){const m=Math.floor(this.remaining/60),s=this.remaining%60;return `${m}:${String(s).padStart(2,'0')}`}
 start(c:any){
  if(!c.openAttemptId&&!confirm(`Commencer le test ${c.subject} · ${c.level} ? Vous aurez ${this.status.durationMinutes} minutes.`))return;
  this.busy=true;this.error='';this.result=null;
  this.api.post<any>('/api/v1/certification/attempts',{subject:c.subject,level:c.level}).subscribe({
   next:a=>{this.busy=false;this.attempt=a;this.answers={};this.tick();clearInterval(this.timer);this.timer=setInterval(()=>this.tick(),1000);window.scrollTo({top:0})},
   error:e=>{this.busy=false;this.error=errorMessage(e)}});
 }
 private tick(){
  this.remaining=Math.max(0,Math.floor((new Date(this.attempt.expiresAt).getTime()-Date.now())/1000));
  if(this.remaining===0&&!this.busy)this.submit(true);
 }
 submit(auto=false){
  if(!auto&&this.answered()<this.attempt.questions.length&&!confirm('Certaines questions sont sans réponse. Envoyer quand même ?'))return;
  this.busy=true;clearInterval(this.timer);
  this.api.post<any>(`/api/v1/certification/attempts/${this.attempt.id}/submit`,{answers:this.answers}).subscribe({
   next:r=>{this.busy=false;this.result=r;this.attempt=null;this.load();window.scrollTo({top:0})},
   error:e=>{this.busy=false;this.error=errorMessage(e);this.attempt=null;this.load()}});
 }
}
