import {Component,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ApiService} from '../core/api.service';

@Component({
 standalone:true,
 imports:[CommonModule],
 template:`
 <section class="page">
   <div class="page-hero">
     <div><div class="eyebrow">CARRIÈRE B2B</div><h1>Les opportunités commencent ici.</h1><p>Découvrez les besoins des établissements et construisez votre prochaine étape professionnelle.</p></div>
     <div class="result-badge">💼 <strong>{{jobs.length}}</strong> offre(s)</div>
   </div>
   <div class="jobs-banner"><div><span>🏫</span><div><strong>Vous êtes une école ?</strong><small>Publiez vos besoins et recevez des candidatures structurées.</small></div></div><button class="btn ghost">Publier une offre</button></div>
   <div class="grid jobs-grid">
     @for(j of jobs;track j.id){
       <article class="job modern-card">
         <div class="job-head"><span class="pill">{{j.contractType||'Enseignement'}}</span><span class="job-city">⌖ {{j.city||'Mali'}}</span></div>
         <h3>{{j.title}}</h3><p class="job-meta">{{j.subject||'Matière'}} · {{j.level||'Tous niveaux'}}</p>
         <p class="bio">{{j.description||'Une opportunité d’enseignement au sein d’un établissement partenaire Profa.'}}</p>
         <div class="card-bottom"><div><small>Rémunération</small><strong>{{j.salaryMin||0 | number}} – {{j.salaryMax||0 | number}} FCFA</strong></div><button class="btn small">Consulter</button></div>
       </article>
     } @empty { <div class="empty"><span>💼</span><h3>Aucune offre ouverte</h3><p>Les nouvelles opportunités apparaîtront ici.</p></div> }
   </div>
 </section>`
})
export class JobsComponent { api=inject(ApiService); jobs:any[]=[]; ngOnInit(){this.api.get<any[]>('/api/v1/jobs').subscribe(x=>this.jobs=x)} }