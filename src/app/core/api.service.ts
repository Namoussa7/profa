import {Injectable,inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {API_BASE_URL} from './config/api.config';

/** Drops undefined/null/'' params so they are not sent as "undefined". */
function clean(params:any){const out:any={};for(const k of Object.keys(params||{})){const v=params[k];if(v!==undefined&&v!==null&&v!=='')out[k]=v}return out}

@Injectable({providedIn:'root'})
export class ApiService{
 http=inject(HttpClient);
 get<T>(url:string,params:any={}){return this.http.get<T>(`${API_BASE_URL}${url}`,{params:clean(params)})}
 post<T>(url:string,body:any={}){return this.http.post<T>(`${API_BASE_URL}${url}`,body)}
 put<T>(url:string,body:any){return this.http.put<T>(`${API_BASE_URL}${url}`,body)}
 patch<T>(url:string,body:any={},params:any={}){return this.http.patch<T>(`${API_BASE_URL}${url}`,body,{params:clean(params)})}
 delete<T>(url:string,body?:any){return this.http.delete<T>(`${API_BASE_URL}${url}`,body?{body}:{})}
 /** multipart/form-data upload (the browser sets the boundary). */
 upload<T>(url:string,form:FormData){return this.http.post<T>(`${API_BASE_URL}${url}`,form)}
 /** Opens an authenticated PDF in a new tab (the JWT cannot be put in a plain link). */
 openPdf(url:string){
  const tab=window.open('','_blank');
  this.http.get(`${API_BASE_URL}${url}`,{responseType:'blob'}).subscribe({
   next:b=>{const u=URL.createObjectURL(b);if(tab){tab.location.href=u}else{window.location.href=u}setTimeout(()=>URL.revokeObjectURL(u),60000)},
   error:()=>{tab?.close();alert('Impossible d’ouvrir ce document.')}
  });
 }
}

/** Shape of paginated API responses. */
export interface Page<T>{content:T[];page:number;size:number;totalElements:number;totalPages:number}

/** Extracts the backend {message} from an HTTP error. */
export function errorMessage(e:any,fallback='Une erreur est survenue. Réessayez.'):string{
 if(e?.status===0)return 'Serveur injoignable. Vérifiez votre connexion.';
 return e?.error?.message||fallback;
}
