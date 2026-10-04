import {Component,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterLink} from '@angular/router';
import {AuthService} from '../core/auth/auth.service';

@Component({
 standalone:true,
 imports:[CommonModule,RouterLink],
 template:`
 <section class="dash dashboard-modern">
   <div class="dash-welcome"><div><div class="eyebrow">VOTRE ESPACE · {{auth.role()}}</div><h1>Bonjour, {{auth.user?.firstName}} <span>👋</span></h1><p>Bienvenue dans votre espace personnel Profa.</p></div><div class="dash-actions"><a class="btn ghost" routerLink="/profil">✎ Modifier mon profil</a><a class="btn ghost" *ngIf="auth.role()==='ADMIN'" routerLink="/admin">Administration</a><button class="btn ghost" (click)="auth.logout()">Déconnexion</button></div></div>
   <div class="welcome-strip"><div><span>✦</span><div><strong>Continuez votre parcours</strong><p>Complétez votre profil pour améliorer votre visibilité et vos recommandations.</p></div></div><div class="profile-progress"><strong>65%</strong><div><div class="progress"><span style="width:65%"></span></div><small>Profil complété</small></div></div></div>
   <div class="stats modern-stats"><div><span class="stat-icon">◉</span><small>Activité</small><strong>En ligne</strong><span>Votre espace est opérationnel</span></div><div><span class="stat-icon">◌</span><small>Messagerie</small><strong>0</strong><span>Conversation(s) non lue(s)</span></div><div><span class="stat-icon">♢</span><small>Notifications</small><strong>0</strong><span>À consulter</span></div></div>
   <div class="dash-grid modern-dash-grid"><article><div class="card-title"><span>⚡</span><div><h3>Actions rapides</h3><small>Accédez directement à vos services</small></div></div><a routerLink="/enseignants">🎓 <span>Rechercher des enseignants</span><b>→</b></a><a routerLink="/emplois">💼 <span>Voir les offres d'emploi</span><b>→</b></a><a routerLink="/">💬 <span>Ouvrir la plateforme</span><b>→</b></a></article><article><div class="card-title"><span>✦</span><div><h3>Votre prochaine étape</h3><small>Faites grandir votre profil</small></div></div><p>Un profil complet vous permet de présenter votre expérience, vos matières et vos disponibilités.</p><a class="text-link" routerLink="/enseignants">Découvrir Profa →</a></article></div>
 </section>`
})
export class DashboardComponent {auth=inject(AuthService)}