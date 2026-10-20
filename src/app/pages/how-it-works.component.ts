import {IconComponent} from '../core/icon.component';
import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
 standalone:true,
 imports:[IconComponent,RouterLink],
 template:`
 <section class="page">
   <div class="page-hero"><div><div class="eyebrow">GUIDE</div><h1>Comment fonctionne Profa ?</h1><p>Une seule plateforme pour les cours particuliers (parents, élèves, enseignants) et le recrutement (écoles).</p></div></div>
   <div class="how-grid">
     <article class="card"><h2><span class="h-ic"><app-icon name="users" [size]="18"/></span>Parents & élèves</h2><ol class="steps">
       <li><b>Cherchez</b> par matière, niveau, ville, mode (domicile, en ligne), tarif et note.</li>
       <li><b>Échangez</b> par message avec l’enseignant ou envoyez une demande de cours.</li>
       <li><b>Réservez</b> un créneau : le prix est calculé automatiquement selon le tarif horaire.</li>
       <li><b>Payez</b> en Orange Money, Moov Money, Wave, carte ou en espèces au cours.</li>
       <li><b>Notez</b> l’enseignant après le cours : seuls les cours terminés peuvent être évalués.</li>
     </ol><a class="btn" routerLink="/enseignants">Trouver un enseignant <app-icon name="arrow" [size]="16"/></a></article>
     <article class="card"><h2><span class="h-ic"><app-icon name="cap" [size]="18"/></span>Enseignants</h2><ol class="steps">
       <li><b>Créez votre profil</b> : matières, niveaux, tarif, disponibilités, vidéo.</li>
       <li><b>Envoyez vos documents</b> (diplôme, pièce d’identité) pour obtenir le badge « Vérifié ».</li>
       <li><b>Recevez des demandes</b> et réservations ; acceptez, confirmez, marquez les cours terminés.</li>
       <li><b>Postulez</b> aux offres des écoles et suivez vos candidatures.</li>
     </ol><a class="btn" routerLink="/inscription" [queryParams]="{role:'TEACHER'}">Devenir enseignant <app-icon name="arrow" [size]="16"/></a></article>
     <article class="card"><h2><span class="h-ic"><app-icon name="school" [size]="18"/></span>Écoles</h2><ol class="steps">
       <li><b>Complétez la fiche</b> de votre établissement.</li>
       <li><b>Publiez vos offres</b> (matière, niveau, contrat, salaire).</li>
       <li><b>Gérez les candidatures</b> : en étude, présélection, entretien, recrutement.</li>
       <li><b>Contactez</b> les candidats directement par la messagerie.</li>
     </ol><a class="btn" routerLink="/inscription" [queryParams]="{role:'SCHOOL'}">Créer un compte école <app-icon name="arrow" [size]="16"/></a></article>
   </div>
   <article class="card faq"><h2>Questions fréquentes</h2>
     <details><summary>Comment les enseignants sont-ils vérifiés ?</summary><p>L’équipe Profa contrôle les diplômes et pièces d’identité transmis. Les profils validés affichent le badge « Vérifié » et remontent en tête des résultats.</p></details>
     <details><summary>Les avis sont-ils fiables ?</summary><p>Oui : un avis ne peut être déposé que par le parent ayant réservé, une seule fois par cours, et uniquement après que le cours a été marqué « terminé ».</p></details>
     <details><summary>Puis-je annuler une réservation ?</summary><p>Oui, depuis votre espace, tant que le cours n’est pas terminé. L’enseignant est notifié immédiatement.</p></details>
     <details><summary>Combien coûte Profa ?</summary><p>L’inscription est gratuite pour les parents, enseignants et écoles. Le tarif des cours est fixé librement par chaque enseignant.</p></details>
   </article>
 </section>`
})
export class HowItWorksComponent {}
