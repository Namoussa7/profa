import {IconComponent} from './core/icon.component';
import {LogoComponent} from './core/logo.component';
import {Component,inject,OnDestroy,OnInit} from '@angular/core';
import {NavigationEnd,Router,RouterLink,RouterLinkActive,RouterOutlet} from '@angular/router';
import {CommonModule} from '@angular/common';
import {filter} from 'rxjs';
import {AuthService} from './core/auth/auth.service';
import {ApiService} from './core/api.service';

@Component({
 selector:'app-root',
 standalone:true,
 imports:[LogoComponent,IconComponent,RouterLink,RouterLinkActive,RouterOutlet,CommonModule],
 template:`
 <a class="skip-link" href="#main">Aller au contenu</a>
 <header class="top">
   <a routerLink="/" class="brand" aria-label="Profa, accueil"><app-logo [size]="38"/></a>
   <nav class="desktop-nav" aria-label="Navigation principale">
     <a routerLink="/enseignants" routerLinkActive="active">Enseignants</a>
     <a routerLink="/emplois" routerLinkActive="active">Emplois</a>
     <a routerLink="/comment-ca-marche" routerLinkActive="active">Comment ça marche</a>
   </nav>
   <div class="actions desktop-actions">
     @if(!auth.isLogged()){
       <a routerLink="/connexion" class="link">Connexion</a>
       <a routerLink="/inscription" class="btn ghost">Créer un compte</a>
     } @else {
       <a routerLink="/messages" class="icon-btn" aria-label="Messages"><app-icon name="message"/>@if(unreadMessages){<b class="badge">{{unreadMessages}}</b>}</a>
       <div class="bell">
         <button type="button" class="icon-btn" aria-label="Notifications" (click)="toggleNotifs()"><app-icon name="bell"/>@if(unreadNotifs){<b class="badge">{{unreadNotifs}}</b>}</button>
         @if(notifsOpen){
           <div class="notif-panel" role="dialog" aria-label="Notifications">
             <div class="notif-head"><strong>Notifications</strong>@if(unreadNotifs){<button type="button" class="text-link" (click)="readAll()">Tout marquer lu</button>}</div>
             @for(n of notifs;track n.id){
               <a class="notif" [class.unread]="!n.read" [routerLink]="n.link||'/dashboard'" (click)="open(n)"><strong>{{n.title}}</strong><small>{{n.body}}</small><em>{{n.createdAt | date:'d MMM, HH:mm'}}</em></a>
             } @empty {<p class="empty-inline pad">Aucune notification pour le moment.</p>}
           </div>
         }
       </div>
       <a routerLink="/profil" class="icon-btn" aria-label="Mon profil"><app-icon name="user"/></a>
       <a [routerLink]="auth.home()" class="btn"><app-icon name="grid" [size]="18"/>Mon espace</a>
     }
   </div>
   <button class="mobile-menu" type="button" aria-label="Menu" [attr.aria-expanded]="menuOpen" (click)="menuOpen=!menuOpen"><app-icon [name]="menuOpen?'x':'menu'"/></button>
 </header>
 <div class="mobile-nav" [class.open]="menuOpen">
   <a routerLink="/enseignants" (click)="menuOpen=false"><app-icon name="cap"/>Enseignants</a>
   <a routerLink="/emplois" (click)="menuOpen=false"><app-icon name="briefcase"/>Emplois</a>
   <a routerLink="/comment-ca-marche" (click)="menuOpen=false"><app-icon name="help"/>Comment ça marche</a>
   @if(!auth.isLogged()){
     <a routerLink="/connexion" (click)="menuOpen=false"><app-icon name="user"/>Connexion</a>
     <a routerLink="/inscription" (click)="menuOpen=false"><app-icon name="sparkle"/>Créer un compte</a>
   } @else {
     <a routerLink="/messages" (click)="menuOpen=false"><app-icon name="message"/>Messages @if(unreadMessages){({{unreadMessages}})}</a>
     <a routerLink="/notifications" (click)="menuOpen=false"><app-icon name="bell"/>Notifications @if(unreadNotifs){({{unreadNotifs}})}</a>
     <a routerLink="/profil" (click)="menuOpen=false"><app-icon name="user"/>Mon profil</a>
     <a [routerLink]="auth.home()" (click)="menuOpen=false"><app-icon name="grid"/>Mon espace</a>
     <a href="" (click)="$event.preventDefault();menuOpen=false;auth.logout()"><app-icon name="logout"/>Déconnexion</a>
   }
 </div>
 <main id="main"><router-outlet/></main>
 <footer>
   <div><a routerLink="/" class="footer-brand" aria-label="Profa, accueil"><app-logo [size]="36" [light]="true"/></a><p>La plateforme qui connecte les talents de l'éducation au Mali et en Afrique.</p></div>
   <div class="footer-links"><a routerLink="/enseignants">Trouver un enseignant</a><a routerLink="/emplois">Offres d'emploi</a><a routerLink="/comment-ca-marche">Comment ça marche</a><a routerLink="/inscription">Devenir enseignant</a></div>
   <span>© 2026 Profa</span>
 </footer>
 <nav class="bottom-nav" aria-label="Navigation mobile">
   <a routerLink="/" routerLinkActive="router-link-active" [routerLinkActiveOptions]="{exact:true}"><span><app-icon name="home" [size]="22"/></span>Accueil</a>
   <a routerLink="/enseignants" routerLinkActive="router-link-active"><span><app-icon name="cap" [size]="22"/></span>Profs</a>
   <a routerLink="/emplois" routerLinkActive="router-link-active"><span><app-icon name="briefcase" [size]="22"/></span>Emplois</a>
   @if(auth.isLogged()){
     <a routerLink="/messages" routerLinkActive="router-link-active"><span><app-icon name="message" [size]="22"/>@if(unreadMessages){<b class="dot"></b>}</span>Messages</a>
     <a [routerLink]="auth.home()" routerLinkActive="router-link-active"><span><app-icon name="grid" [size]="22"/>@if(unreadNotifs){<b class="dot"></b>}</span>Espace</a>
   } @else {
     <a routerLink="/connexion" routerLinkActive="router-link-active"><span><app-icon name="user" [size]="22"/></span>Connexion</a>
   }
 </nav>`,
 host:{'(document:keydown.escape)':'notifsOpen=false'}
})
export class AppComponent implements OnInit,OnDestroy{
 auth=inject(AuthService);api=inject(ApiService);router=inject(Router);
 menuOpen=false;notifsOpen=false;notifs:any[]=[];unreadNotifs=0;unreadMessages=0;
 private timer:any;

 ngOnInit(){
  this.refresh();
  this.timer=setInterval(()=>this.refresh(),30000);
  this.router.events.pipe(filter(e=>e instanceof NavigationEnd)).subscribe(()=>{this.notifsOpen=false;this.menuOpen=false;this.refresh()});
 }
 ngOnDestroy(){clearInterval(this.timer)}
 refresh(){
  if(!this.auth.isLogged()){this.unreadNotifs=0;this.unreadMessages=0;return}
  this.api.get<any>('/api/v1/notifications/unread-count').subscribe({next:x=>this.unreadNotifs=x.count,error:()=>{}});
  this.api.get<any>('/api/v1/messaging/unread-count').subscribe({next:x=>this.unreadMessages=x.count,error:()=>{}});
 }
 toggleNotifs(){this.notifsOpen=!this.notifsOpen;if(this.notifsOpen)this.api.get<any[]>('/api/v1/notifications').subscribe({next:x=>this.notifs=x,error:()=>{}})}
 open(n:any){this.notifsOpen=false;if(!n.read)this.api.patch(`/api/v1/notifications/${n.id}/read`).subscribe({next:()=>this.refresh(),error:()=>{}})}
 readAll(){this.api.patch('/api/v1/notifications/read-all').subscribe({next:()=>{this.notifs.forEach(n=>n.read=true);this.unreadNotifs=0},error:()=>{}})}
}
