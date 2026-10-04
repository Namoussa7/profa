import {Component,inject} from '@angular/core';
import {RouterLink,RouterOutlet} from '@angular/router';
import {CommonModule} from '@angular/common';
import {AuthService} from './core/auth/auth.service';

@Component({
 selector:'app-root',
 standalone:true,
 imports:[RouterLink,RouterOutlet,CommonModule],
 template:`
 <header class="top">
   <a routerLink="/" class="brand"><span class="logo">P</span><span>Profa</span></a>
   <nav class="desktop-nav">
     <a routerLink="/enseignants">Enseignants</a>
     <a routerLink="/emplois">Emplois</a>
   </nav>
   <div class="actions desktop-actions">
     <a routerLink="/connexion" class="link" *ngIf="!auth.isLogged()">Connexion</a>
     <a routerLink="/inscription" class="btn ghost" *ngIf="!auth.isLogged()">Créer un compte</a>
     <a routerLink="/profil" class="btn ghost" *ngIf="auth.isLogged()">Mon profil</a><a routerLink="/dashboard" class="btn" *ngIf="auth.isLogged()">Mon espace</a>
   </div>
   <button class="mobile-menu" type="button" aria-label="Menu" (click)="menuOpen=!menuOpen">☰</button>
 </header>
 <div class="mobile-nav" [class.open]="menuOpen">
   <a routerLink="/enseignants" (click)="menuOpen=false">🎓 Enseignants</a>
   <a routerLink="/emplois" (click)="menuOpen=false">💼 Emplois</a>
   <a routerLink="/connexion" *ngIf="!auth.isLogged()" (click)="menuOpen=false">↪ Connexion</a>
   <a routerLink="/inscription" *ngIf="!auth.isLogged()" (click)="menuOpen=false">✨ Créer un compte</a>
   <a routerLink="/profil" *ngIf="auth.isLogged()" (click)="menuOpen=false">👤 Mon profil</a><a routerLink="/dashboard" *ngIf="auth.isLogged()" (click)="menuOpen=false">▣ Mon espace</a>
 </div>
 <main><router-outlet/></main>
 <footer>
   <div><a routerLink="/" class="footer-brand"><span class="logo">P</span><b>Profa</b></a><p>La plateforme qui connecte les talents de l'éducation au Mali et en Afrique.</p></div>
   <div class="footer-links"><a routerLink="/enseignants">Enseignants</a><a routerLink="/emplois">Emplois</a><a routerLink="/inscription">Rejoindre Profa</a></div>
   <span>© 2026 Profa</span>
 </footer>
 <nav class="bottom-nav">
   <a routerLink="/"><span>⌂</span>Accueil</a>
   <a routerLink="/enseignants"><span>🎓</span>Enseignants</a>
   <a routerLink="/emplois"><span>💼</span>Emplois</a>
   <a routerLink="/profil" *ngIf="auth.isLogged()"><span>◉</span>Profil</a><a routerLink="/dashboard" *ngIf="auth.isLogged()"><span>⌁</span>Espace</a>
 </nav>`,
 styles:[]
})
export class AppComponent {
 auth=inject(AuthService);
 menuOpen=false;
}