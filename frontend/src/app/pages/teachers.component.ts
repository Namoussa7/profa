import {Component,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ApiService} from '../core/api.service';

@Component({
 standalone:true,
 imports:[CommonModule,FormsModule],
 template:`
 <section class="page">
   <div class="page-hero">
     <div><div class="eyebrow">MARKETPLACE B2C</div><h1>Trouvez votre enseignant.</h1><p>Des profils adaptés à vos besoins, au Mali et à distance.</p></div>
     <div class="result-badge">✦ <strong>{{teachers.length}}</strong> profil(s)</div>
   </div>
   <div class="search-panel">
     <div class="field"><span>⌖</span><input [(ngModel)]="city" placeholder="Ville ou quartier"></div>
     <div class="field"><span>₣</span><input type="number" [(ngModel)]="maxRate" placeholder="Tarif maximum (FCFA/h)"></div>
     <button class="btn" (click)="load()">Rechercher <span>→</span></button>
   </div>
   <div class="grid teacher-grid">
     @for(t of teachers;track t.id){
       <article class="teacher modern-card">
         <div class="card-top"><div class="avatar">{{initial(t)}}</div><div class="verified" *ngIf="t.verified">✓ Vérifié</div></div>
         <div class="teacher-role">{{t.city||'Mali'}} · {{t.experienceYears||0}} ans d'expérience</div>
         <h3>{{t.headline||'Enseignant Profa'}}</h3>
         <p class="bio">{{t.bio||'Profil pédagogique disponible pour cours à domicile ou à distance.'}}</p>
         <div class="tag-row"><span class="pill">Cours à domicile</span><span class="pill">À distance</span></div>
         <div class="card-bottom"><div><small>À partir de</small><strong>{{t.hourlyRate||0 | number}} FCFA <em>/ h</em></strong></div><button class="btn small">Voir le profil</button></div>
       </article>
     } @empty { <div class="empty"><span>🎓</span><h3>Aucun profil trouvé</h3><p>Essayez une autre ville ou augmentez votre tarif maximum.</p></div> }
   </div>
 </section>`
})
export class TeachersComponent {
 api=inject(ApiService); teachers:any[]=[]; city=''; maxRate:any=null;
 ngOnInit(){this.load()}
 load(){this.api.get<any[]>('/api/v1/teachers',{city:this.city||undefined,maxRate:this.maxRate||undefined}).subscribe(x=>this.teachers=x)}
 initial(t:any){return (t.headline||'P').charAt(0).toUpperCase()}
}