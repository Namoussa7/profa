import {Directive,ElementRef,Input,NgZone,OnChanges,OnDestroy,inject} from '@angular/core';

/** Rolls a number up to its new value (French formatting). Runs outside Angular: no change detection per frame. */
@Directive({selector:'[countUp]',standalone:true})
export class CountUpDirective implements OnChanges,OnDestroy{
 @Input() countUp:number|null|undefined=0;
 @Input() countSuffix='';
 private el=inject(ElementRef<HTMLElement>);private zone=inject(NgZone);
 private raf=0;private from=0;

 ngOnChanges(){
  const to=Number(this.countUp)||0,from=this.from;this.from=to;
  const fmt=(n:number)=>Math.round(n).toLocaleString('fr-FR')+this.countSuffix;
  cancelAnimationFrame(this.raf);
  if(from===to||matchMedia('(prefers-reduced-motion: reduce)').matches){this.el.nativeElement.textContent=fmt(to);return}
  const t0=performance.now(),d=900;
  this.zone.runOutsideAngular(()=>{
   const step=(t:number)=>{
    const p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,3);
    this.el.nativeElement.textContent=fmt(from+(to-from)*e);
    if(p<1)this.raf=requestAnimationFrame(step);
   };
   this.raf=requestAnimationFrame(step);
  });
 }
 ngOnDestroy(){cancelAnimationFrame(this.raf)}
}
