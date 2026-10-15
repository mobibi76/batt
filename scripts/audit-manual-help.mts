import {expect,type Page} from '@playwright/test';
export const helpAuditResults:unknown[]=[];
// Reuses the manual's isolated synthetic workflows, including administrator fixtures.
export async function auditHelp(page:Page,state:string){
 const scroll=await page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.scrollTop||e.scrollLeft).map(e=>({e,x:e.scrollLeft,y:e.scrollTop})) .map(({e,x,y})=>{e.setAttribute('data-audit-scroll',`${x},${y}`);return true;}));
 for(const [width,height] of [[1366,900],[1366,768],[390,844],[320,480]]){
  await page.setViewportSize({width,height});await page.getByRole('button',{name:'사용 안내',exact:true}).click();
  const expected:Record<string,[string,string]>={'cells/check':['원본·검증 결과 확인','.modal'],'matching/confirm':['팩 구성','.modal'],'packs/detail':['근거와 이력 조회','.modal']};
  const topics=page.getByRole('navigation',{name:'설명할 항목'}).getByRole('button');const count=await topics.count();
  for(let i=0;i<count;i++){
   await topics.nth(i).click();await expect(topics.nth(i)).toHaveAttribute('aria-pressed','true');
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const result=await page.evaluate(()=>{
    const spot=document.querySelector('.manual-spotlight')?.getBoundingClientRect();
    const panel=document.querySelector('.manual-explanation')!.getBoundingClientRect();
    const label=document.querySelector('.manual-current strong')?.textContent;
    return {label,spot:spot?{x:spot.x,y:spot.y,w:spot.width,h:spot.height}:null,panel:{x:panel.x,y:panel.y,w:panel.width,h:panel.height},unavailable:!!document.querySelector('.manual-current small')};
   });
   expect(result.unavailable).toBe(!result.spot);
   if(expected[state]?.[0]===result.label)expect(result.spot,`${state} must highlight its open dialog`).not.toBeNull();
   if(result.spot){expect(result.spot.x).toBeGreaterThanOrEqual(-1);expect(result.spot.y).toBeGreaterThanOrEqual(-1);expect(result.spot.x+result.spot.w).toBeLessThanOrEqual(width+1);expect(result.spot.y+result.spot.h).toBeLessThanOrEqual(height+1);}
   await expect(page.getByRole('button',{name:'설명 닫기',exact:true})).toBeInViewport({ratio:1});
   const reveal=page.getByRole('button',{name:'강조 영역만 보기',exact:true});
   if(await reveal.isVisible()){
    await reveal.click();await expect(page.locator('.manual-spotlight')).toBeVisible();
    await expect(page.getByRole('button',{name:'설명 다시 펼치기',exact:true})).toBeInViewport({ratio:1});
    if(state==='inspection/judgement'||state==='sample/values')await page.screenshot({path:`.local/help-${state.replace('/','-')}-${width}.png`});
    await page.getByRole('button',{name:'설명 다시 펼치기',exact:true}).click();
   }
   helpAuditResults.push({state,width,height,...result});
  }
  await page.getByRole('button',{name:'설명 닫기',exact:true}).click();
 }
 await page.setViewportSize({width:1366,height:900});
 if(scroll.length)await page.evaluate(()=>document.querySelectorAll('[data-audit-scroll]').forEach(e=>{const [x,y]=e.getAttribute('data-audit-scroll')!.split(',').map(Number);e.scrollTo(x,y);e.removeAttribute('data-audit-scroll');}));
 console.log(`Help verified: ${state}`);
}
