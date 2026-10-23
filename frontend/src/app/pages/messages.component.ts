import {IconComponent} from '../core/icon.component';
import {Component,ElementRef,inject,OnDestroy,OnInit,ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,Router,RouterLink} from '@angular/router';
import {ApiService,errorMessage} from '../core/api.service';
import {AuthService} from '../core/auth/auth.service';
import {initials} from '../core/labels';

@Component({
 standalone:true,
 imports:[IconComponent,CommonModule,FormsModule,RouterLink],
 template:`
 <section class="page messages-page">
   <div class="page-hero"><div><div class="eyebrow">MESSAGERIE</div><h1>Messages</h1><p>Échangez avec les enseignants, parents et écoles avant et après les cours.</p></div></div>
   <div class="chat" [class.has-active]="!!activeId">
     <aside class="chat-list" aria-label="Conversations">
       @for(c of conversations;track c.id){
         <a class="chat-item" [class.active]="c.id===activeId" [routerLink]="['/messages',c.id]">
           <span class="avatar sm">{{ini(c.otherName)}}</span>
           <span class="chat-meta"><strong>{{c.otherName}}</strong><small>{{c.lastMessage||'Nouvelle conversation'}}</small></span>
           @if(c.unread){<b class="badge">{{c.unread}}</b>}
         </a>
       } @empty {<div class="empty-inline pad">Aucune conversation. Contactez un enseignant depuis son profil.<br><a class="text-link" routerLink="/enseignants">Trouver un enseignant <app-icon name="arrow" [size]="16"/></a></div>}
     </aside>
     <div class="chat-thread">
       @if(active){
         <div class="chat-head"><a class="back-mobile" routerLink="/messages" aria-label="Retour"><app-icon name="back"/></a><span class="avatar sm">{{ini(active.otherName)}}</span><strong>{{active.otherName}}</strong></div>
         <div class="chat-body" #body>
           @for(m of messages;track m.id){
             <div class="bubble" [class.mine]="m.senderId===me"><p>{{m.body}}</p><small>{{m.createdAt | date:'d MMM HH:mm'}}@if(m.senderId===me){ · {{m.read?'Lu':'Envoyé'}}}</small></div>
           } @empty {<p class="empty-inline pad">Dites bonjour ! Présentez votre besoin (matière, niveau, disponibilités).</p>}
         </div>
         <form class="chat-input" (ngSubmit)="send()">
           <textarea name="body" rows="1" [(ngModel)]="draft" placeholder="Écrivez votre message…" (keydown.enter)="onEnter($event)" maxlength="5000" aria-label="Message"></textarea>
           <button class="btn" [disabled]="!draft.trim()||sending" aria-label="Envoyer"><app-icon name="send" [size]="18"/></button>
         </form>
         @if(error){<p class="error pad" role="alert">{{error}}</p>}
         <p class="muted small pad">Pour votre sécurité, gardez vos échanges et paiements sur Profa.</p>
       } @else {
         <div class="empty-inline pad center">Sélectionnez une conversation.</div>
       }
     </div>
   </div>
 </section>`
})
export class MessagesComponent implements OnInit,OnDestroy{
 api=inject(ApiService);auth=inject(AuthService);route=inject(ActivatedRoute);router=inject(Router);
 @ViewChild('body') body?:ElementRef<HTMLElement>;
 conversations:any[]=[];messages:any[]=[];activeId:string|null=null;draft='';sending=false;error='';
 me=this.auth.userId();
 private timer:any;

 get active(){return this.conversations.find(c=>c.id===this.activeId)}
 ngOnInit(){
  this.route.paramMap.subscribe(p=>{this.activeId=p.get('id');this.messages=[];this.loadConversations();this.loadMessages()});
  // Polling keeps the thread fresh without extra client libraries (the backend also exposes STOMP on /ws).
  this.timer=setInterval(()=>{if(document.hidden)return;this.loadConversations();this.loadMessages(true)},6000);
 }
 ngOnDestroy(){clearInterval(this.timer)}
 ini(n:string){const [a,b]=(n||'').split(' ');return initials(a,b)}
 loadConversations(){this.api.get<any[]>('/api/v1/messaging/conversations').subscribe({next:x=>this.conversations=x,error:()=>{}})}
 loadMessages(silent=false){
  if(!this.activeId)return;
  this.api.get<any[]>(`/api/v1/messaging/conversations/${this.activeId}/messages`).subscribe({
   next:x=>{const grew=x.length!==this.messages.length;this.messages=x;if(grew)this.scroll()},
   error:e=>{if(!silent)this.error=errorMessage(e,'Conversation inaccessible.')}
  });
 }
 onEnter(e:Event){const k=e as KeyboardEvent;if(!k.shiftKey){k.preventDefault();this.send()}}
 send(){
  const body=this.draft.trim();if(!body||!this.activeId)return;
  this.sending=true;this.error='';
  this.api.post<any>('/api/v1/messaging/messages',{conversationId:this.activeId,body}).subscribe({
   next:m=>{this.messages=[...this.messages,m];this.draft='';this.sending=false;this.scroll();this.loadConversations()},
   error:e=>{this.error=errorMessage(e,'Message non envoyé.');this.sending=false}
  });
 }
 private scroll(){setTimeout(()=>{const el=this.body?.nativeElement;if(el)el.scrollTop=el.scrollHeight})}
}
