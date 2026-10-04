import {Component,inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import {AuthService} from '../../core/auth/auth.service';

@Component({
 standalone:true,
 imports:[FormsModule,RouterLink],
 template:`
 <section class="auth auth-register">
   <div class="auth-visual"><div class="eyebrow">REJOIGNEZ PROFA</div><h1>Votre profil.<br><span>Vos opportunités.</span></h1><p>Choisissez votre espace et commencez à construire votre expérience éducative.</p><div class="role-preview"><div><span>👨‍👩‍👧</span><strong>Parent / Étudiant</strong><small>Trouvez un enseignant</small></div><div><span>👨‍🏫</span><strong>Enseignant</strong><small>Développez votre activité</small></div><div><span>🏫</span><strong>École</strong><small>Recrutez vos talents</small></div></div></div>
   <div class="auth-card wide">
     <div class="auth-card-head"><div class="auth-mark">P</div><div><div class="eyebrow">CRÉER UN COMPTE</div><h2>Bienvenue 👋</h2></div></div>
     <p class="auth-subtitle">Quel espace souhaitez-vous créer ?</p>
     <div class="roles"><button type="button" [class.active]="form.role==='PARENT'" (click)="form.role='PARENT'">👨‍👩‍👧 <span>Parent / Étudiant</span></button><button type="button" [class.active]="form.role==='TEACHER'" (click)="form.role='TEACHER'">👨‍🏫 <span>Enseignant</span></button><button type="button" [class.active]="form.role==='SCHOOL'" (click)="form.role='SCHOOL'">🏫 <span>École</span></button></div>
     <form (ngSubmit)="submit()">
       <div class="two"><label>Prénom<input name="firstName" [(ngModel)]="form.firstName" placeholder="Votre prénom" required></label><label>Nom<input name="lastName" [(ngModel)]="form.lastName" placeholder="Votre nom" required></label></div>
       <label>Email<input name="email" type="email" [(ngModel)]="form.email" placeholder="vous@exemple.com" required></label>
       <label>Téléphone <span class="optional">(facultatif)</span><input name="phone" [(ngModel)]="form.phone" placeholder="+223 ..."></label>
       <label>Mot de passe<input name="password" type="password" [(ngModel)]="form.password" placeholder="8 caractères minimum" required minlength="8"></label>
       <button class="btn big full">Créer mon compte <span>→</span></button>
     </form>
     <p class="error">{{error}}</p>
     <div class="auth-footer">Déjà inscrit ? <a routerLink="/connexion">Se connecter</a></div>
   </div>
 </section>`
})
export class RegisterComponent {
 auth=inject(AuthService);router=inject(Router);form:any={role:'PARENT'};error='';
 submit(){this.auth.register(this.form).subscribe({next:(x)=>{const data=x?.data??x;const user=data?.user??data;this.router.navigateByUrl(user?.role==='ADMIN'?'/admin':'/dashboard')},error:e=>this.error=e?.error?.message||'Inscription impossible'})}
}