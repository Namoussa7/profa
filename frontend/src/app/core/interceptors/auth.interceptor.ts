import {HttpErrorResponse,HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {Router} from '@angular/router';
import {catchError,throwError} from 'rxjs';
import {AuthService} from '../auth/auth.service';

export const authInterceptor:HttpInterceptorFn=(req,next)=>{
 const auth=inject(AuthService);const router=inject(Router);
 const t=auth.token();
 // API calls go straight to the network: the service worker only caches the app shell and static assets.
 // (Query param rather than header, so no extra CORS preflight.)
 const r=req.clone({setParams:{'ngsw-bypass':'true'},...(t?{setHeaders:{Authorization:`Bearer ${t}`}}:{})});
 return next(r).pipe(catchError((e:HttpErrorResponse)=>{
  // Expired/invalid session: clear it and send the user back to the login page.
  if(e.status===401&&t&&!req.url.includes('/api/v1/auth/')){auth.clear();router.navigate(['/connexion'],{queryParams:{next:router.url,expired:1}})}
  return throwError(()=>e);
 }));
};
