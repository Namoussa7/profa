import {Component,Input,OnChanges} from '@angular/core';

/** Circular progress gauge (0–100) that draws itself in when the value arrives. */
@Component({
 selector:'app-ring',
 standalone:true,
 template:`
 <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 100 100" role="img" [attr.aria-label]="label+' : '+pct+' %'">
   <circle cx="50" cy="50" r="42" class="ring-track"/>
   <circle cx="50" cy="50" r="42" class="ring-bar" [attr.stroke]="color" stroke-dasharray="264" [attr.stroke-dashoffset]="264-264*drawn/100"/>
 </svg>
 <span class="ring-val"><b>{{pct}}%</b>@if(caption){<small>{{caption}}</small>}</span>`,
 host:{class:'ring'}
})
export class RingComponent implements OnChanges{
 @Input() value:number|null|undefined=0;
 @Input() size=92;
 @Input() color='var(--primary)';
 @Input() label='';
 @Input() caption='';
 pct=0;drawn=0;
 ngOnChanges(){
  this.pct=Math.max(0,Math.min(100,Math.round(Number(this.value)||0)));
  // Next frame, so the CSS transition animates from the previous value.
  requestAnimationFrame(()=>this.drawn=this.pct);
 }
}
