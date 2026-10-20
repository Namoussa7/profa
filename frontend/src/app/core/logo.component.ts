import {Component,Input} from '@angular/core';

/**
 * Profa brand mark: a "P" whose bowl is a speech bubble (the teacher–family conversation)
 * topped by a graduation cap, with the amber dot of "la bonne rencontre".
 */
@Component({
 selector:'app-logo',
 standalone:true,
 template:`
 <svg class="logo-mark" [attr.width]="size" [attr.height]="size" viewBox="0 0 48 48" role="img" aria-label="Profa">
   <defs>
     <linearGradient [attr.id]="gid" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#3355f0"/><stop offset="1" stop-color="#1a33b8"/>
     </linearGradient>
   </defs>
   <rect width="48" height="48" rx="14" [attr.fill]="'url(#'+gid+')'"/>
   <!-- graduation cap -->
   <path d="M24 6.5 35 11.5 24 16.5 13 11.5z" fill="#fff" opacity=".95"/>
   <path d="M33 12.5v5" stroke="#ffa630" stroke-width="2" stroke-linecap="round"/>
   <circle cx="33" cy="18.6" r="1.6" fill="#ffa630"/>
   <!-- P = stem + speech-bubble bowl -->
   <path d="M17 19.5h9.5a7 7 0 0 1 0 14H21.5l-4.5 3.8z" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/>
   <path d="M17 19.5V41" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
 </svg>
 @if(word){<span class="logo-word" [class.light]="light">Profa</span>}`,
 styles:[`:host{display:inline-flex;align-items:center;gap:10px;line-height:1}
 .logo-mark{flex:none;filter:drop-shadow(0 6px 14px rgba(37,71,224,.28))}
 .logo-word{font-weight:800;font-size:22px;letter-spacing:-.035em;color:var(--navy,#0b1638)}
 .logo-word.light{color:#fff}`]
})
export class LogoComponent{
 private static n=0;
 gid='profa-g'+(LogoComponent.n++);
 @Input() size=38;
 @Input() word=true;
 @Input() light=false;
}
