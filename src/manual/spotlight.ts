import type {ManualStep} from './content';
export type Rect={left:number;top:number;width:number;height:number};

// Intersect with every clipping ancestor, not just the browser viewport.
export function visibleRect(element:Element):Rect|null {
 if(!element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return null;
 const r=element.getBoundingClientRect();let left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);
 for(let node:Element|null=element;node;node=node.parentElement){
  const css=getComputedStyle(node);
  if(css.display==='none'||css.visibility==='hidden'||css.visibility==='collapse'||Number(css.opacity)===0)return null;
  if(node!==element){const b=node.getBoundingClientRect();
   if(/auto|scroll|hidden|clip/.test(css.overflowX)){left=Math.max(left,b.left+node.clientLeft);right=Math.min(right,b.left+node.clientLeft+node.clientWidth);}
   if(/auto|scroll|hidden|clip/.test(css.overflowY)){top=Math.max(top,b.top+node.clientTop);bottom=Math.min(bottom,b.top+node.clientTop+node.clientHeight);}
  }
 }
 return right>left&&bottom>top?{left,top,width:right-left,height:bottom-top}:null;
}
export function findTargets(step:ManualStep):Element[]{
 const modal=[...document.querySelectorAll('[role="dialog"]:not(.manual-dialog)')].filter(e=>visibleRect(e)).at(-1);
 const scope=modal||document;
 const pick=(selector:string)=>[...(scope instanceof Element&&scope.matches(selector)?[scope]:[]),...scope.querySelectorAll(selector)].find(e=>!e.closest('.manual-dialog')&&visibleRect(e));
 // Comma-separated alternatives are ordered fallbacks, not DOM-order matches.
 if(step.targets)return step.targets.map(pick).filter((e):e is Element=>!!e);
 for(const selector of (step.target||'').split(',').map(s=>s.trim()).filter(Boolean)){const found=pick(selector);if(found)return [found];}
 return [];
}
export function targetRect(step:ManualStep):Rect|null {
 const boxes=findTargets(step).map(visibleRect).filter((r):r is Rect=>!!r);if(!boxes.length)return null;
 const left=Math.min(...boxes.map(r=>r.left)),top=Math.min(...boxes.map(r=>r.top));
 return {left,top,width:Math.max(...boxes.map(r=>r.left+r.width))-left,height:Math.max(...boxes.map(r=>r.top+r.height))-top};
}
export function overlap(a:Rect,b:Rect){return Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));}

export function paddedRect(rect:Rect):Rect {
 const padding=12,edge=4;
 const left=Math.max(edge,rect.left-padding),top=Math.max(edge,rect.top-padding);
 const right=Math.min(innerWidth-edge,rect.left+rect.width+padding),bottom=Math.min(innerHeight-edge,rect.top+rect.height+padding);
 return {left,top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};
}
