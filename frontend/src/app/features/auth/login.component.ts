import {IconComponent} from '../../core/icon.component';
import {LogoComponent} from '../../core/logo.component';
import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,Router,RouterLink} from '@angular/router';
import {AuthService} from '../../core/auth/auth.service';
import {errorMessage} from '../../core/api.service';

@Component({
 standalone:true,
 imports:[LogoComponent,IconComponent,FormsModule,RouterLink],
 template:`
 <section class="auth auth-modern">
   <div class="auth-visual"><div class="eyebrow">BIENVENUE SUR PROFA</div><h1>Apprenez.<br><span>Progressez.</span><br>Réussissez.</h1><p>Retrouvez vos cours, vos échanges et vos opportunités dans un seul espace.</p><div class="auth-points"><span><app-icon name="shield" [size]="16"/>Profils vérifiés</span><span><app-icon name="star" [size]="16"/>Avis authentiques</span><span><app-icon name="wallet" [size]="16"/>Paiement Mobile Money</span></div></div>
   <div class="auth-card">
     <div class="auth-card-head"><app-logo [size]="48" [word]="false"/><div><div class="eyebrow">VOTRE ESPACE</div><h2>Connexion</h2></div></div>
     @if(expired){<p class="notice">Votre session a expiré. Reconnectez-vous pour continuer.</p>}
     <p class="auth-subtitle">Connectez-vous pour continuer votre expérience Profa.</p>
     <form (ngSubmit)="submit()" #f="ngForm">
       <label>Email<input name="email" type="email" autocomplete="email" [(ngModel)]="form.email" placeholder="vous@exemple.com" required email></label>
       <label>Mot de passe
         <span class="pwd"><input name="password" [type]="show?'text':'password'" autocomplete="current-password" [(ngModel)]="form.password" placeholder="••••••••" required><button type="button" (click)="show=!show" [attr.aria-label]="show?'Masquer le mot de passe':'Afficher le mot de passe'"><app-icon name="eye" [size]="18"/></button></span>
       </label>
       <button class="btn big full" [disabled]="loading||f.invalid">{{loading?'Connexion…':'Se connecter'}} @if(!loading){<app-icon name="arrow" [size]="18"/>}</button>
     </form>
     <p class="error" role="alert">{{error}}</p>
     <div class="auth-footer">Pas encore de compte ? <a routerLink="/inscription">Créer mon compte</a></div>
   </div>
 </section>`
})
export class LoginComponent {
 auth=inject(AuthService);router=inject(Router);route=inject(ActivatedRoute);
 form:any={};loading=false;error='';show=false;
 expired=!!this.route.snapshot.queryParamMap.get('expired');
 submit(){
  this.loading=true;this.error='';
  this.auth.login(this.form).subscribe({
   next:()=>{const next=this.route.snapshot.queryParamMap.get('next');this.router.navigateByUrl(next&&next.startsWith('/')&&!next.startsWith('//')?next:this.auth.home())},
   error:e=>{this.error=errorMessage(e,'Connexion impossible');this.loading=false}
  });
 }
}
