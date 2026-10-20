import {Component,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterLink} from '@angular/router';
import {ApiService} from '../core/api.service';

@Component({
 standalone:true,
 imports:[CommonModule,RouterLink],
 template:`
 <section class="page">
   <div class="page-hero"><div><div class="eyebrow">ACTIVITÉ</div><h1>Notifications</h1><p>Demandes, réservations, paiements, candidatures et messages.</p></div>@if(hasUnread()){<button class="btn ghost" (click)="readAll()">Tout marquer comme lu</button>}</div>
   <div class="card">
     @for(n of items;track n.id){
       <a class="notif" [class.unread]="!n.read" [routerLink]="n.link||'/dashboard'" (click)="read(n)"><strong>{{n.title}}</strong><small>{{n.body}}</small><em>{{n.createdAt | date:'d MMM y, HH:mm'}}</em></a>
     } @empty {<p class="empty-inline">Aucune notification pour le moment.</p>}
   </div>
 </section>`
})
export class NotificationsComponent implements OnInit{
 api=inject(ApiService);items:any[]=[];
 ngOnInit(){this.api.get<any[]>('/api/v1/notifications').subscribe({next:x=>this.items=x,error:()=>{}})}
 hasUnread(){return this.items.some(n=>!n.read)}
 read(n:any){if(!n.read)this.api.patch(`/api/v1/notifications/${n.id}/read`).subscribe({error:()=>{}})}
 readAll(){this.api.patch('/api/v1/notifications/read-all').subscribe({next:()=>this.items.forEach(n=>n.read=true),error:()=>{}})}
}
