import {Injectable,inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {tap} from 'rxjs';
import {Router} from '@angular/router';
import {API_BASE_URL} from '../config/api.config';

export interface SessionUser{id?:string;email?:string;role:string;firstName:string;lastName:string}

function decode(token:string|null):any{
 if(!token)return null;
 try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(decodeURIComponent(escape(atob(p))))}catch{return null}
}

@Injectable({providedIn:'root'})
export class AuthService{
 http=inject(HttpClient);
 router=inject(Router);
 user:SessionUser|null=JSON.parse(localStorage.getItem('profa_user')||'null');

 token(){return localStorage.getItem('profa_token')}
 login(data:any){return this.http.post<any>(`${API_BASE_URL}/api/v1/auth/login`,data).pipe(tap(x=>this.save(x)))}
 register(data:any){return this.http.post<any>(`${API_BASE_URL}/api/v1/auth/register`,data).pipe(tap(x=>this.save(x)))}
 save(x:any){
  const data=x?.data??x;const token=data?.token??data?.accessToken;
  if(!token)throw new Error('Réponse d’authentification invalide : token manquant');
  const u=data?.user??data;
  const user:SessionUser={id:u.id??decode(token)?.sub,email:u.email,role:u.role,firstName:u.firstName,lastName:u.lastName};
  localStorage.setItem('profa_token',token);localStorage.setItem('profa_user',JSON.stringify(user));this.user=user;
 }
 updateNames(firstName:string,lastName:string){if(!this.user)return;this.user={...this.user,firstName,lastName};localStorage.setItem('profa_user',JSON.stringify(this.user))}
 /** Clears only Profa keys (not the whole origin storage). */
 clear(){localStorage.removeItem('profa_token');localStorage.removeItem('profa_user');this.user=null}
 logout(redirect='/'){this.clear();this.router.navigateByUrl(redirect)}
 expired(){const exp=decode(this.token())?.exp;return !exp||exp*1000<Date.now()}
 isLogged(){if(!this.token())return false;if(this.expired()){this.clear();return false}return true}
 role(){return this.user?.role}
 userId():string|undefined{return this.user?.id??decode(this.token())?.sub}
 home(){return this.role()==='ADMIN'?'/admin':'/dashboard'}
}
