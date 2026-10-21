import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {ApiService,errorMessage} from '../../core/api.service';
import {AuthService} from '../../core/auth/auth.service';
import {LogoComponent} from '../../core/logo.component';
import {IconComponent} from '../../core/icon.component';
import {passwordIssues} from '../../core/labels';

@Component({
 standalone:true,
 imports:[FormsModule,RouterLink,LogoComponent,IconComponent],
 template:`
 <section class="auth auth-single">
   <div class="auth-card narrow">
     <div class="auth-card-head"><app-logo [size]="48" [word]="false"/><div><div class="eyebrow">Sécurité</div><h2>Nouveau mot de passe</h2></div></div>
     @if(!token){
       <div class="result-panel ko"><app-icon name="x" [size]="22"/><div><strong>Lien incomplet</strong><p>Ouvrez le lien reçu par e-mail en entier, ou faites une nouvelle demande.</p></div></div>
       <a class="btn full" routerLink="/mot-de-passe-oublie">Nouvelle demande</a>
     } @else if(done){
       <div class="result-panel ok"><app-icon name="check" [size]="22"/><div><strong>Mot de passe modifié</strong><p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe. Vos anciennes sessions ont été fermées.</p></div></div>
       <a class="btn big full" routerLink="/connexion">Se connecter <app-icon name="arrow" [size]="18"/></a>
     } @else {
       <p class="auth-subtitle">Choisissez un mot de passe d’au moins 8 caractères, avec au moins une lettre et un chiffre.</p>
       <form (ngSubmit)="submit()" #f="ngForm">
         <label>Nouveau mot de passe
           <span class="pwd"><input name="password" [type]="show?'text':'password'" autocomplete="new-password" [(ngModel)]="password" required minlength="8"><button type="button" (click)="show=!show" aria-label="Afficher le mot de passe"><app-icon name="eye" [size]="18"/></button></span>
         </label>
         <ul class="pwd-rules">@for(r of rules();track r.label){<li [class.ok]="r.ok"><app-icon [name]="r.ok?'check':'x'" [size]="14"/>{{r.label}}</li>}</ul>
         <label>Confirmer<input name="confirm" [type]="show?'text':'password'" autocomplete="new-password" [(ngModel)]="confirm" required></label>
         @if(confirm&&confirm!==password){<p class="error">Les deux mots de passe ne correspondent pas.</p>}
         <button class="btn big full" [disabled]="loading||!valid()">{{loading?'Enregistrement…':'Enregistrer le mot de passe'}}</button>
       </form>
       <p class="error" role="alert">{{error}}</p>
     }
     <div class="auth-footer"><a routerLink="/connexion"><app-icon name="back" [size]="14"/> Retour à la connexion</a></div>
   </div>
 </section>`
})
export class ResetPasswordComponent{
 api=inject(ApiService);auth=inject(AuthService);route=inject(ActivatedRoute);
 token=this.route.snapshot.queryParamMap.get('token')||'';
 password='';confirm='';show=false;loading=false;done=false;error='';
 rules(){return passwordIssues(this.password)}
 valid(){return this.rules().every(r=>r.ok)&&this.password===this.confirm}
 submit(){
  this.loading=true;this.error='';
  this.api.post('/api/v1/auth/reset-password',{token:this.token,password:this.password}).subscribe({
   next:()=>{this.done=true;this.loading=false;this.auth.clear()},
   error:e=>{this.error=errorMessage(e);this.loading=false}
  });
 }
}
