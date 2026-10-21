import {IconComponent} from '../../core/icon.component';
import {LogoComponent} from '../../core/logo.component';
import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,Router,RouterLink} from '@angular/router';
import {AuthService} from '../../core/auth/auth.service';
import {errorMessage} from '../../core/api.service';
import {passwordIssues} from '../../core/labels';

@Component({
 standalone:true,
 imports:[LogoComponent,IconComponent,FormsModule,RouterLink],
 template:`
 <section class="auth auth-register">
   <div class="auth-visual"><div class="eyebrow">REJOIGNEZ PROFA</div><h1>Votre profil.<br><span>Vos opportunités.</span></h1><p>Choisissez votre espace et commencez à construire votre expérience éducative.</p><div class="role-preview"><div><span><app-icon name="users"/></span><strong>Parent / Étudiant</strong><small>Trouvez un enseignant, réservez, payez en Mobile Money</small></div><div><span><app-icon name="cap"/></span><strong>Enseignant</strong><small>Publiez votre profil, recevez des élèves et des offres d’emploi</small></div><div><span><app-icon name="school"/></span><strong>École</strong><small>Publiez vos offres et gérez vos candidatures</small></div></div></div>
   <div class="auth-card wide">
     <div class="auth-card-head"><app-logo [size]="48" [word]="false"/><div><div class="eyebrow">CRÉER UN COMPTE</div><h2>Bienvenue</h2></div></div>
     <p class="auth-subtitle">Quel espace souhaitez-vous créer ?</p>
     <div class="roles" role="radiogroup"><button type="button" role="radio" [attr.aria-checked]="form.role==='PARENT'" [class.active]="form.role==='PARENT'" (click)="form.role='PARENT'"><app-icon name="users" [size]="22"/><span>Parent / Étudiant</span></button><button type="button" role="radio" [attr.aria-checked]="form.role==='TEACHER'" [class.active]="form.role==='TEACHER'" (click)="form.role='TEACHER'"><app-icon name="cap" [size]="22"/><span>Enseignant</span></button><button type="button" role="radio" [attr.aria-checked]="form.role==='SCHOOL'" [class.active]="form.role==='SCHOOL'" (click)="form.role='SCHOOL'"><app-icon name="school" [size]="22"/><span>École</span></button></div>
     <form (ngSubmit)="submit()" #f="ngForm">
       <div class="two"><label>{{form.role==='SCHOOL'?'Prénom du responsable':'Prénom'}}<input name="firstName" autocomplete="given-name" [(ngModel)]="form.firstName" placeholder="Votre prénom" required></label><label>Nom<input name="lastName" autocomplete="family-name" [(ngModel)]="form.lastName" placeholder="Votre nom" required></label></div>
       <label>Email<input name="email" type="email" autocomplete="email" [(ngModel)]="form.email" placeholder="vous@exemple.com" required email></label>
       <label>Téléphone / WhatsApp <span class="optional">(facultatif)</span><input name="phone" type="tel" autocomplete="tel" [(ngModel)]="form.phone" placeholder="+223 ..."></label>
       <label>Mot de passe<input name="password" type="password" autocomplete="new-password" [(ngModel)]="form.password" placeholder="8 caractères, une lettre et un chiffre" required minlength="8"></label>
       @if(form.password){<ul class="pwd-rules">@for(r of rules();track r.label){<li [class.ok]="r.ok"><app-icon [name]="r.ok?'check':'x'" [size]="14"/>{{r.label}}</li>}</ul>}
       @if(form.role==='TEACHER'){<p class="notice"><app-icon name="file" [size]="18"/> Après l’inscription, vous devrez envoyer votre <b>CV</b> et votre <b>diplôme</b> en PDF pour apparaître dans la recherche.</p>}
       <label class="check"><input type="checkbox" name="terms" [(ngModel)]="terms" required> J’accepte les conditions d’utilisation et la politique de confidentialité de Profa.</label>
       <button class="btn big full" [disabled]="loading||f.invalid||!terms||!pwdOk()">{{loading?'Création…':'Créer mon compte'}} <app-icon name="arrow" [size]="18"/></button>
     </form>
     <p class="error" role="alert">{{error}}</p>
     <div class="auth-footer">Déjà inscrit ? <a routerLink="/connexion">Se connecter</a></div>
   </div>
 </section>`
})
export class RegisterComponent {
 auth=inject(AuthService);router=inject(Router);route=inject(ActivatedRoute);
 form:any={role:['PARENT','TEACHER','SCHOOL'].includes(this.route.snapshot.queryParamMap.get('role')||'')?this.route.snapshot.queryParamMap.get('role'):'PARENT'};
 error='';loading=false;terms=false;
 rules(){return passwordIssues(this.form.password)}
 pwdOk(){return this.rules().every(r=>r.ok)}
 submit(){
  this.loading=true;this.error='';
  this.auth.register(this.form).subscribe({
   // Teachers and schools are sent to their profile first (onboarding), like Preply / Superprof.
   next:()=>this.router.navigateByUrl(this.form.role==='PARENT'?'/enseignants':this.form.role==='TEACHER'?'/dashboard?onboarding=1':'/profil?onboarding=1'),
   error:e=>{this.error=errorMessage(e,'Inscription impossible');this.loading=false}
  });
 }
}
