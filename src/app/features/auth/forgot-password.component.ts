import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {ApiService,errorMessage} from '../../core/api.service';
import {LogoComponent} from '../../core/logo.component';
import {IconComponent} from '../../core/icon.component';

@Component({
 standalone:true,
 imports:[FormsModule,RouterLink,LogoComponent,IconComponent],
 template:`
 <section class="auth auth-single">
   <div class="auth-card narrow">
     <div class="auth-card-head"><app-logo [size]="48" [word]="false"/><div><div class="eyebrow">Accès au compte</div><h2>Mot de passe oublié</h2></div></div>
     @if(!sent){
       <p class="auth-subtitle">Saisissez l’adresse e-mail de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
       <form (ngSubmit)="submit()" #f="ngForm">
         <label>Email<input name="email" type="email" autocomplete="email" [(ngModel)]="email" placeholder="vous@exemple.com" required email></label>
         <button class="btn big full" [disabled]="loading||f.invalid">{{loading?'Envoi…':'Recevoir le lien'}} <app-icon name="send" [size]="18"/></button>
       </form>
       <p class="error" role="alert">{{error}}</p>
     } @else {
       <div class="result-panel ok"><app-icon name="check" [size]="22"/><div><strong>Demande enregistrée</strong><p>{{message}}</p></div></div>
       <p class="muted small">Le lien est valable 60 minutes. Pensez à vérifier vos courriers indésirables. Vous ne recevez rien ? Contactez l’administrateur Profa : il peut vous transmettre un lien par WhatsApp ou SMS.</p>
     }
     <div class="auth-footer"><a routerLink="/connexion"><app-icon name="back" [size]="14"/> Retour à la connexion</a></div>
   </div>
 </section>`
})
export class ForgotPasswordComponent{
 api=inject(ApiService);
 email='';loading=false;sent=false;message='';error='';
 submit(){
  this.loading=true;this.error='';
  this.api.post<any>('/api/v1/auth/forgot-password',{email:this.email}).subscribe({
   next:r=>{this.sent=true;this.message=r?.message||'Si un compte existe avec cette adresse, un lien vient d’être envoyé.';this.loading=false},
   error:e=>{this.error=errorMessage(e);this.loading=false}
  });
 }
}
