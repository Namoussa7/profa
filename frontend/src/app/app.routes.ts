import {Routes} from '@angular/router';
import {HomeComponent} from './pages/home.component';
import {authGuard,guestGuard,notParentGuard,roleGuard} from './core/auth/guards';

// Home is eager (first paint); every other page is a separate chunk, preloaded in the background after start-up.
export const routes:Routes=[
 {path:'',component:HomeComponent,title:'Profa — Cours particuliers et recrutement d’enseignants au Mali'},
 {path:'connexion',loadComponent:()=>import('./features/auth/login.component').then(m=>m.LoginComponent),canActivate:[guestGuard],title:'Connexion — Profa'},
 {path:'inscription',loadComponent:()=>import('./features/auth/register.component').then(m=>m.RegisterComponent),canActivate:[guestGuard],title:'Créer un compte — Profa'},
 {path:'mot-de-passe-oublie',loadComponent:()=>import('./features/auth/forgot-password.component').then(m=>m.ForgotPasswordComponent),title:'Mot de passe oublié — Profa'},
 {path:'reinitialiser-mot-de-passe',loadComponent:()=>import('./features/auth/reset-password.component').then(m=>m.ResetPasswordComponent),title:'Nouveau mot de passe — Profa'},
 {path:'enseignants',loadComponent:()=>import('./pages/teachers.component').then(m=>m.TeachersComponent),title:'Trouver un enseignant — Profa'},
 {path:'enseignants/:id',loadComponent:()=>import('./pages/teacher-detail.component').then(m=>m.TeacherDetailComponent),title:'Profil enseignant — Profa'},
 {path:'emplois',loadComponent:()=>import('./pages/jobs.component').then(m=>m.JobsComponent),canActivate:[notParentGuard],title:'Offres d’emploi enseignants — Profa'},
 {path:'comment-ca-marche',loadComponent:()=>import('./pages/how-it-works.component').then(m=>m.HowItWorksComponent),title:'Comment ça marche — Profa'},
 {path:'dashboard',loadComponent:()=>import('./pages/dashboard.component').then(m=>m.DashboardComponent),canActivate:[authGuard],title:'Mon espace — Profa'},
 {path:'profil',loadComponent:()=>import('./pages/profile.component').then(m=>m.ProfileComponent),canActivate:[authGuard],title:'Mon profil — Profa'},
 {path:'messages',loadComponent:()=>import('./pages/messages.component').then(m=>m.MessagesComponent),canActivate:[authGuard],title:'Messages — Profa'},
 {path:'messages/:id',loadComponent:()=>import('./pages/messages.component').then(m=>m.MessagesComponent),canActivate:[authGuard],title:'Messages — Profa'},
 {path:'notifications',loadComponent:()=>import('./pages/notifications.component').then(m=>m.NotificationsComponent),canActivate:[authGuard],title:'Notifications — Profa'},
 {path:'admin',loadComponent:()=>import('./features/admin/admin-dashboard.component').then(m=>m.AdminDashboardComponent),canActivate:[roleGuard('ADMIN')],title:'Administration — Profa'},
 {path:'**',redirectTo:''}
];
