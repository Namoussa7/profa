import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
 standalone:true,
 imports:[RouterLink],
 template:`
 <section class="hero">
   <div class="hero-copy">
     <div class="eyebrow">PROFA · MALI · AFRIQUE</div>
     <h1>L'éducation commence par <span>la bonne rencontre.</span></h1>
     <p>Parents, étudiants, enseignants et écoles se retrouvent sur une plateforme simple, moderne et pensée pour les réalités locales.</p>
     <div class="hero-actions">
       <a routerLink="/enseignants" class="btn big">Trouver un enseignant <span>→</span></a>
       <a routerLink="/inscription" class="btn ghost big">Rejoindre Profa</a>
     </div>
     <div class="trust"><span>✓ Profils vérifiés</span><span>✓ Cours à domicile</span><span>✓ À distance</span></div>
   </div>
   <div class="hero-visual">
     <div class="hero-glow"></div>
     <div class="hero-card">
       <div class="hero-card-top"><span class="mini-icon">✦</span><div><small>PROFA MATCH</small><strong>Trouvez votre profil idéal</strong></div></div>
       <a routerLink="/enseignants"><b>🎓</b><div><strong>Prendre des cours</strong><small>À domicile ou à distance</small></div><i>→</i></a>
       <a routerLink="/emplois"><b>🏫</b><div><strong>Recruter un enseignant</strong><small>Publiez vos besoins</small></div><i>→</i></a>
       <a routerLink="/inscription"><b>👨‍🏫</b><div><strong>Devenir enseignant</strong><small>Développez votre activité</small></div><i>→</i></a>
     </div>
     <div class="floating-card"><span>✓</span><div><strong>Confiance</strong><small>Des profils vérifiés</small></div></div>
   </div>
 </section>
 <section class="section-intro"><div><div class="eyebrow">POUR TOUS LES ACTEURS</div><h2>Une seule plateforme,<br><span>plus de possibilités.</span></h2></div><p>Profa simplifie la recherche de cours, le recrutement et la mise en relation avec une expérience fluide sur téléphone comme sur ordinateur.</p></section>
 <section class="features modern-features">
   <div class="feature-card"><span class="feature-number">01</span><div class="feature-icon">🎯</div><h3>Le bon match</h3><p>Filtrez par matière, niveau, localisation, tarif et expérience.</p><a routerLink="/enseignants">Explorer les profils →</a></div>
   <div class="feature-card featured"><span class="feature-number">02</span><div class="feature-icon">🛡️</div><h3>La confiance d'abord</h3><p>Profils, documents et validations administratives pour une communauté fiable.</p><a routerLink="/inscription">Créer mon profil →</a></div>
   <div class="feature-card"><span class="feature-number">03</span><div class="feature-icon">🏫</div><h3>Pour les écoles</h3><p>Publiez vos offres et recevez des candidatures structurées au même endroit.</p><a routerLink="/emplois">Voir les offres →</a></div>
 </section>
 <section class="home-cta"><div><div class="eyebrow">PRÊT À COMMENCER ?</div><h2>Votre prochaine réussite<br>peut commencer aujourd'hui.</h2></div><a routerLink="/inscription" class="btn light big">Créer mon compte →</a></section>
 <div class="home-spacer"></div>`
})
export class HomeComponent {}