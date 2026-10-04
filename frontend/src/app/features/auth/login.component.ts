import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {AuthService} from '../../core/auth/auth.service';

@Component({
 standalone:true,
 imports:[FormsModule,RouterLink],
 template:`
 <section class="auth auth-modern">
   <div class="auth-visual"><div class="eyebrow">BIENVENUE SUR PROFA</div><h1>Apprenez.<br><span>Progressez.</span><br>Réussissez.</h1><p>Retrouvez vos cours, vos échanges et vos opportunités dans un seul espace.</p><div class="auth-points"><span>✓ Profils vérifiés</span><span>✓ Expérience mobile</span><span>✓ Communauté locale</span></div></div>
   <div class="auth-card">
     <div class="auth-card-head"><div class="auth-mark">P</div><div><div class="eyebrow">VOTRE ESPACE</div><h2>Connexion</h2></div></div>
     <p class="auth-subtitle">Connectez-vous pour continuer votre expérience Profa.</p>
     <form (ngSubmit)="submit()">
       <label>Email<input name="email" type="email" [(ngModel)]="form.email" placeholder="vous@exemple.com" required></label>
       <label>Mot de passe<input name="password" type="password" [(ngModel)]="form.password" placeholder="••••••••" required></label>
       <button class="btn big full" [disabled]="loading">{{loading?'Connexion...':'Se connecter'}} <span *ngIf="!loading">→</span></button>
     </form>
     <p class="error">{{error}}</p>
     <div class="auth-footer">Pas encore de compte ? <a routerLink="/inscription">Créer mon compte</a></div>
   </div>
 </section>`
})
export class LoginComponent {
 auth=inject(AuthService); router=inject(Router); form:any={}; loading=false; error='';
 submit(){this.loading=true;this.error='';this.auth.login(this.form).subscribe({next:(x)=>{const data=x?.data??x;const user=data?.user??data;this.router.navigateByUrl(user?.role==='ADMIN'?'/admin':'/dashboard')},error:e=>{this.error=e?.error?.message||'Connexion impossible';this.loading=false}})}
}