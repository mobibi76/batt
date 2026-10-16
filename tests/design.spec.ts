import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
for(const width of [1440,900,768,390,320])test('integrated task geometry at '+width,async({page})=>{
 await page.setViewportSize({width,height:720});await page.goto('/batt/');await page.getByRole('button',{name:'사용 권한 신청',exact:true}).click();await expect(page.getByLabel('이름',{exact:true})).toBeVisible();await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 for(const name of ['운영 현황','셀 데이터','셀 매칭','팩 · 검사이력','품질 리포트','알고리즘 검증','공정 관리','품질·공정 승인함','사용자 관리']){
 await navigate(page,name);await expect(page.locator('.operations-console')).toBeVisible();await expect(page.locator('.sidebar')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 const exit=await page.getByRole('button',{name:'로그아웃',exact:true}).boundingBox();expect(exit.y+exit.height).toBeLessThanOrEqual(720);
 const groups=await page.locator('.visible-task-tabs:visible, .choice-chips:visible, .upload-actions:visible, .console-task-actions:visible').evaluateAll(es=>es.map(e=>[...e.children].filter(c=>c.getBoundingClientRect().width>0).map(c=>c.getBoundingClientRect().width)));
 for(const widths of groups)if(widths.length>1)expect(Math.max(...widths)-Math.min(...widths)).toBeLessThanOrEqual(1);
 if(name==='셀 데이터'){const boxes=await page.locator('.upload-actions > *').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,height:r.height};}));expect(boxes).toHaveLength(2);expect(boxes[0]).toEqual(boxes[1]);await step(page,'셀 재고');await expect(page.getByPlaceholder('셀 ID 또는 LOT 검색')).toBeVisible();}
 }
});

test('login hero stays readable against the brightest green background',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/batt/');const title=page.locator('.auth-copy h1');await expect(title).toContainText('좋은 배터리는');await expect(title).toBeVisible();
 const contrast=await title.evaluate(el=>{
  const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number);
  const luminance=(v:number[])=>v.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
  const fg=luminance(rgb(getComputedStyle(el).color));const bg=getComputedStyle(document.querySelector('.auth-story')!).backgroundImage.match(/rgb\([^)]+\)/)![0];const background=luminance(rgb(bg));return (Math.max(fg,background)+.05)/(Math.min(fg,background)+.05);
 });expect(contrast).toBeGreaterThanOrEqual(4.5);
});
