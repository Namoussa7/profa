import {Routes} from '@angular/router';
import {HomeComponent} from './pages/home.component';
import {LoginComponent} from './features/auth/login.component';
import {RegisterComponent} from './features/auth/register.component';
import {DashboardComponent} from './pages/dashboard.component';
import {TeachersComponent} from './pages/teachers.component';
import {TeacherDetailComponent} from './pages/teacher-detail.component';
import {JobsComponent} from './pages/jobs.component';
import {AdminDashboardComponent} from './features/admin/admin-dashboard.component';
import {ProfileComponent} from './pages/profile.component';
import {MessagesComponent} from './pages/messages.component';
import {NotificationsComponent} from './pages/notifications.component';
import {HowItWorksComponent} from './pages/how-it-works.component';
import {authGuard,guestGuard,roleGuard} from './core/auth/guards';

export const routes:Routes=[
 {path:'',component:HomeComponent,title:'Profa — Cours particuliers et recrutement d’enseignants au Mali'},
 {path:'connexion',component:LoginComponent,canActivate:[guestGuard],title:'Connexion — Profa'},
 {path:'inscription',component:RegisterComponent,canActivate:[guestGuard],title:'Créer un compte — Profa'},
 {path:'enseignants',component:TeachersComponent,title:'Trouver un enseignant — Profa'},
 {path:'enseignants/:id',component:TeacherDetailComponent,title:'Profil enseignant — Profa'},
 {path:'emplois',component:JobsComponent,title:'Offres d’emploi enseignants — Profa'},
 {path:'comment-ca-marche',component:HowItWorksComponent,title:'Comment ça marche — Profa'},
 {path:'dashboard',component:DashboardComponent,canActivate:[authGuard],title:'Mon espace — Profa'},
 {path:'profil',component:ProfileComponent,canActivate:[authGuard],title:'Mon profil — Profa'},
 {path:'messages',component:MessagesComponent,canActivate:[authGuard],title:'Messages — Profa'},
 {path:'messages/:id',component:MessagesComponent,canActivate:[authGuard],title:'Messages — Profa'},
 {path:'notifications',component:NotificationsComponent,canActivate:[authGuard],title:'Notifications — Profa'},
 {path:'admin',component:AdminDashboardComponent,canActivate:[roleGuard('ADMIN')],title:'Administration — Profa'},
 {path:'**',redirectTo:''}
];
