// Shared vocabulary of the marketplace (Mali school system).
export const SUBJECTS=['Mathématiques','Physique-Chimie','SVT','Français','Anglais','Arabe','Philosophie','Histoire-Géographie','Informatique','Économie','Comptabilité','Allemand','Espagnol','Bambara','Études coraniques','Préparation DEF','Préparation BAC','Musique'];
export const LEVELS=['Fondamental 1','Fondamental 2 (DEF)','Lycée (BAC)','Université','Adultes / Pro'];
export const CITIES=['Bamako','Kati','Ségou','Sikasso','Mopti','Kayes','Koutiala','Gao','Tombouctou'];
export const MODES:{[k:string]:string}={ONLINE:'En ligne',HOME:'À domicile',CENTER:'Chez l’enseignant'};
export const CONTRACTS=['CDI','CDD','Vacataire','Stage','Temps partiel'];
export const DOC_TYPES:{[k:string]:string}={DIPLOMA:'Diplôme',ID_CARD:'Pièce d’identité',CV:'CV',CRIMINAL_RECORD:'Casier judiciaire',CERTIFICATE:'Attestation',OTHER:'Autre'};
export const PAY_METHODS:{[k:string]:string}={ORANGE_MONEY:'Orange Money',MOOV_MONEY:'Moov Money',WAVE:'Wave',CARD:'Carte bancaire',CASH:'Espèces (au cours)'};

export const STATUS:{[k:string]:string}={
 PENDING:'En attente',ACCEPTED:'Acceptée',DECLINED:'Refusée',CANCELLED:'Annulée',
 PENDING_PAYMENT:'À payer',CONFIRMED:'Confirmée',COMPLETED:'Terminée',
 UNPAID:'Non payé',PAID:'Payé',REFUNDED:'Remboursé',FAILED:'Échoué',
 APPROVED:'Approuvé',REJECTED:'Refusé',OPEN:'Ouverte',CLOSED:'Fermée',
 NEW:'Nouvelle',REVIEWING:'En étude',SHORTLISTED:'Présélectionné',INTERVIEW:'Entretien',HIRED:'Recruté'
};
export const APP_STATUSES=['NEW','REVIEWING','SHORTLISTED','INTERVIEW','HIRED','REJECTED'];

export function label(map:{[k:string]:string},v:string|null|undefined){return v?(map[v]||v):'—'}
export function list(csv:string|null|undefined):string[]{return (csv||'').split(',').map(s=>s.trim()).filter(Boolean)}
export function modes(csv:string|null|undefined){return list(csv).map(m=>MODES[m]||m)}
export function stars(avg:number){const r=Math.round(avg||0);return '★'.repeat(r)+'☆'.repeat(5-r)}
export function initials(first?:string,last?:string){return ((first||'')[0]||'P').toUpperCase()+((last||'')[0]||'').toUpperCase()}
export function statusClass(s:string){return ['ACCEPTED','CONFIRMED','COMPLETED','PAID','APPROVED','OPEN','HIRED','SHORTLISTED'].includes(s)?'ok':['DECLINED','CANCELLED','REJECTED','FAILED','CLOSED'].includes(s)?'ko':'wait'}
