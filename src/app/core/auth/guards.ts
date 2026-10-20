import {inject} from '@angular/core';
import {CanActivateFn,Router} from '@angular/router';
import {AuthService} from './auth.service';

export const authGuard:CanActivateFn=(_route,state)=>{
 const auth=inject(AuthService);
 return auth.isLogged()?true:inject(Router).createUrlTree(['/connexion'],{queryParams:{next:state.url}});
};

export const roleGuard=(...roles:string[]):CanActivateFn=>(_route,state)=>{
 const auth=inject(AuthService);const router=inject(Router);
 if(!auth.isLogged())return router.createUrlTree(['/connexion'],{queryParams:{next:state.url}});
 return roles.includes(auth.role()||'')?true:router.createUrlTree([auth.home()]);
};

/** Login/register pages: already-logged users go to their space. */
export const guestGuard:CanActivateFn=()=>{
 const auth=inject(AuthService);
 return auth.isLogged()?inject(Router).createUrlTree([auth.home()]):true;
};
