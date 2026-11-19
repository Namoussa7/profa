import {IconComponent} from './core/icon.component';
import {LogoComponent} from './core/logo.component';
import {Component,inject,OnDestroy,OnInit} from '@angular/core';
import {NavigationEnd,Router,RouterLink,RouterLinkActive,RouterOutlet} from '@angular/router';
import {CommonModule} from '@angular/common';
import {filter} from 'rxjs';
import {AuthService} from './core/auth/auth.service';
import {ApiService} from './core/api.service';
import {API_BASE_URL} from './core/config/api.config';

@Component({
 selector:'app-root',
 standalone:true,
 imports:[LogoComponent,IconComponent,RouterLink,RouterLinkActive,RouterOutlet,CommonModule],
 template:`
 <a class="skip-link" href="#main">Aller au contenu</a>
 @if(auth.isLogged()){
 <!-- Signed-in space: floating icon rail (desktop) -->
 <aside class="rail" aria-label="Navigation de votre espace">
   <a routerLink="/" class="rail-logo" aria-label="Profa, accueil"><app-logo [size]="40" [word]="false"/></a>
   <nav>
     @for(i of railItems();track i.link){
       <a [routerLink]="i.link" routerLinkActive="on" [routerLinkActiveOptions]="{exact:i.link==='/'}" [attr.data-tip]="i.label" [attr.aria-label]="i.label"><app-icon [name]="i.icon" [size]="20"/>@if(i.dot){<b class="dot"></b>}</a>
     }
   </nav>
   <div class="rail-foot">
     <a routerLink="/comment-ca-marche" routerLinkActive="on" data-tip="Aide" aria-label="Aide"><app-icon name="help" [size]="20"/></a>
     <button type="button" data-tip="Déconnexion" aria-label="Déconnexion" (click)="auth.logout()"><app-icon name="logout" [size]="20"/></button>
   </div>
 </aside>
 }
 <header class="top" [class.app-top]="auth.isLogged()">
   <a routerLink="/" class="brand" aria-label="Profa, accueil"><app-logo [size]="38"/></a>
   @if(!auth.isLogged()){
   <nav class="desktop-nav" aria-label="Navigation principale">
     <a routerLink="/enseignants" routerLinkActive="active">Enseignants</a>
     @if(showJobs()){<a routerLink="/emplois" routerLinkActive="active">Emplois</a>}
     <a routerLink="/comment-ca-marche" routerLinkActive="active">Comment ça marche</a>
   </nav>
   } @else {
   <div class="crumbs">
     <span class="crumb-pill"><b>Profa</b><i>/</i>{{section}}</span>
     <span class="date-chip"><i class="live"></i>{{now | date:'EEE d MMM'}}<b>{{now | date:'HH:mm'}}</b></span>
   </div>
   <form class="top-search" role="search" (submit)="$event.preventDefault();search(q.value);q.value=''">
     <app-icon name="search" [size]="17"/><input #q id="top-search" name="q" placeholder="Rechercher une matière…" aria-label="Rechercher un enseignant par matière"><kbd>Ctrl K</kbd>
   </form>
   }
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
       <a routerLink="/profil" class="me-chip" aria-label="Mon profil"><span class="avatar">{{initials()}}</span><span><b>{{auth.user?.firstName}} {{auth.user?.lastName}}</b><small>{{roleName()}}</small></span><app-icon name="chevron" [size]="16"/></a>
     }
   </div>
   <button class="mobile-menu" type="button" aria-label="Menu" [attr.aria-expanded]="menuOpen" (click)="menuOpen=!menuOpen"><app-icon [name]="menuOpen?'x':'menu'"/></button>
 </header>
 <div class="mobile-nav" [class.open]="menuOpen">
   <a routerLink="/enseignants" (click)="menuOpen=false"><app-icon name="cap"/>Enseignants</a>
   @if(showJobs()){<a routerLink="/emplois" (click)="menuOpen=false"><app-icon name="briefcase"/>Emplois</a>}
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
 @if(waking){<div class="wake-banner" role="status"><span class="spinner"></span>Démarrage du serveur Profa… cela peut prendre jusqu’à une minute la première fois.</div>}
 <main id="main"><router-outlet/></main>
 @if(!auth.isLogged()){
 <footer>
   <div><a routerLink="/" class="footer-brand" aria-label="Profa, accueil"><app-logo [size]="36" [light]="true"/></a><p>La plateforme qui connecte les talents de l'éducation au Mali et en Afrique.</p></div>
   <div class="footer-links"><a routerLink="/enseignants">Trouver un enseignant</a>@if(showJobs()){<a routerLink="/emplois">Offres d'emploi</a>}<a routerLink="/comment-ca-marche">Comment ça marche</a><a routerLink="/tarifs">Tarifs</a><a routerLink="/inscription">Devenir enseignant</a></div>
   <span>© 2026 Profa</span>
 </footer>
 }
 <nav class="bottom-nav" aria-label="Navigation mobile">
   <a routerLink="/" routerLinkActive="router-link-active" [routerLinkActiveOptions]="{exact:true}"><span><app-icon name="home" [size]="22"/></span>Accueil</a>
   <a routerLink="/enseignants" routerLinkActive="router-link-active"><span><app-icon name="cap" [size]="22"/></span>Profs</a>
   @if(showJobs()){   <a routerLink="/emplois" routerLinkActive="router-link-active"><span><app-icon name="briefcase" [size]="22"/></span>Emplois</a>}
   @if(auth.isLogged()){
     <a routerLink="/messages" routerLinkActive="router-link-active"><span><app-icon name="message" [size]="22"/>@if(unreadMessages){<b class="dot"></b>}</span>Messages</a>
     <a [routerLink]="auth.home()" routerLinkActive="router-link-active"><span><app-icon name="grid" [size]="22"/>@if(unreadNotifs){<b class="dot"></b>}</span>Espace</a>
   } @else {
     <a routerLink="/connexion" routerLinkActive="router-link-active"><span><app-icon name="user" [size]="22"/></span>Connexion</a>
   }
 </nav>`,
 host:{'(document:keydown.escape)':'notifsOpen=false','(document:keydown)':'hotkey($event)','[class.shell]':'auth.isLogged()'}
})
export class AppComponent implements OnInit,OnDestroy{
 auth=inject(AuthService);api=inject(ApiService);router=inject(Router);
 menuOpen=false;notifsOpen=false;notifs:any[]=[];unreadNotifs=0;unreadMessages=0;
 private timer:any;private clock:any;
 now=new Date();section='Accueil';

 /** Free hosting puts the API to sleep: wake it up immediately and tell the user if it is slow. */
 waking=false;
 private wake(){
  let done=false;
  const slow=setTimeout(()=>{if(!done)this.waking=true},2500);
  const ping=(tries:number)=>this.api.http.get(`${API_BASE_URL}/actuator/health`).subscribe({
   next:()=>{done=true;clearTimeout(slow);this.waking=false},
   error:()=>{if(tries>0)setTimeout(()=>ping(tries-1),5000);else{done=true;this.waking=false}}});
  ping(12);
 }
 ngOnInit(){
  this.wake();
  this.refresh();
  this.timer=setInterval(()=>this.refresh(),60000);
  this.clock=setInterval(()=>this.now=new Date(),30000);
  this.section=this.sectionOf(this.router.url);
  // Refresh badges as soon as the user comes back to the tab instead of polling in the background.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.refresh()});
  this.router.events.pipe(filter(e=>e instanceof NavigationEnd)).subscribe(()=>{this.notifsOpen=false;this.menuOpen=false;this.section=this.sectionOf(this.router.url);this.refresh()});
 }
 ngOnDestroy(){clearInterval(this.timer);clearInterval(this.clock)}
 /** Breadcrumb label of the current page. */
 sectionOf(url:string){
  const seg=url.split(/[/?#]/)[1]||'';
  return ({'':'Accueil',dashboard:'Mon espace',admin:'Administration',enseignants:'Enseignants',emplois:'Emplois',messages:'Messages',
   notifications:'Notifications',profil:'Mon profil',certification:'Certification',tarifs:'Tarifs','comment-ca-marche':'Aide'} as any)[seg]||'Profa';
 }
 railItems(){
  const r=this.auth.role();
  return [
   {link:this.auth.home(),icon:'grid',label:r==='ADMIN'?'Administration':'Mon espace'},
   {link:'/enseignants',icon:'cap',label:'Enseignants'},
   ...(this.showJobs()?[{link:'/emplois',icon:'briefcase',label:'Emplois'}]:[]),
   {link:'/messages',icon:'message',label:'Messages',dot:this.unreadMessages>0},
   {link:'/notifications',icon:'bell',label:'Notifications',dot:this.unreadNotifs>0},
   ...(r==='TEACHER'?[{link:'/certification',icon:'shield',label:'Certification'}]:[]),
   {link:'/tarifs',icon:'wallet',label:'Tarifs'},
   {link:'/profil',icon:'user',label:'Mon profil'},
  ] as {link:string;icon:string;label:string;dot?:boolean}[];
 }
 initials(){const u=this.auth.user;return ((u?.firstName||'?').charAt(0)+(u?.lastName||'').charAt(0)).toUpperCase()}
 roleName(){return ({TEACHER:'Enseignant',SCHOOL:'École',PARENT:'Parent / élève',ADMIN:'Administrateur'} as any)[this.auth.role()||'']||''}
 search(q:string){q=q.trim();this.router.navigate(['/enseignants'],{queryParams:q?{subject:q}:{}})}
 /** Ctrl/⌘ + K focuses the search field, as in the top bar hint. */
 hotkey(e:KeyboardEvent){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){const i=document.getElementById('top-search');if(i){e.preventDefault();i.focus()}}}
 refresh(){
  if(document.hidden)return;
  if(!this.auth.isLogged()){this.unreadNotifs=0;this.unreadMessages=0;return}
  this.api.get<any>('/api/v1/notifications/unread-count').subscribe({next:x=>this.unreadNotifs=x.count,error:()=>{}});
  this.api.get<any>('/api/v1/messaging/unread-count').subscribe({next:x=>this.unreadMessages=x.count,error:()=>{}});
 }
 /** School job offers are hidden from parents (B2C space). */
 showJobs(){return this.auth.role()!=='PARENT'}
 toggleNotifs(){this.notifsOpen=!this.notifsOpen;if(this.notifsOpen)this.api.get<any[]>('/api/v1/notifications').subscribe({next:x=>this.notifs=x,error:()=>{}})}
 open(n:any){this.notifsOpen=false;if(!n.read)this.api.patch(`/api/v1/notifications/${n.id}/read`).subscribe({next:()=>this.refresh(),error:()=>{}})}
 readAll(){this.api.patch('/api/v1/notifications/read-all').subscribe({next:()=>{this.notifs.forEach(n=>n.read=true);this.unreadNotifs=0},error:()=>{}})}
}
