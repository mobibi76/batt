import {test,expect,type Page} from '@playwright/test';
import {navigate,step} from './workspace';
async function inspect(page:Page,screen:string){return page.locator('button:visible, .choice-chip:visible span, .file-button:visible, .twin-import:visible').evaluateAll((elements,screen)=>{
 const issues:string[]=[];
 for(const element of elements){
  if(element.closest('svg'))continue;
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node:Node|null;
  while((node=walker.nextNode())){
   if((node.parentElement?.closest('svg,[aria-hidden="true"]')))continue;
   const value=node.textContent||'';
   for(const match of value.matchAll(/[가-힣]{2,}/g)){
    const tops=new Set<number>();
    for(let i=match.index!;i<match.index!+match[0].length;i++){const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const rect=range.getBoundingClientRect();if(rect.width&&rect.height)tops.add(Math.round(rect.top));}
    if(tops.size>1)issues.push(`${screen}: ${element.textContent?.trim()} [${match[0]} 분리]`);
   }
  }
  if(element.scrollWidth>element.clientWidth+2)issues.push(`${screen}: ${element.textContent?.trim()} [가로 넘침]`);
 }
 return issues;
},screen);}
async function inspectSteps(page:Page,screen:string){
 const issues=await inspect(page,screen);
 const tools=page.getByRole('button',{name:'작업 도구',exact:true});if(await tools.isVisible())await tools.click();
 const nav=page.locator('.visible-task-tabs:visible').last();
 if(await nav.count()){
  const labels=await nav.getByRole('button').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')||e.textContent||''));
  for(const label of labels){
   await step(page,label);issues.push(...await inspect(page,`${screen}/${label}`));
   const tabs=page.locator('.editor-tabs:visible button, .evidence-tabs:visible button');
   for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();issues.push(...await inspect(page,`${screen}/${label}/상세 탭 ${i+1}`));}
  }
 }
 return issues;
}
for(const width of [800,834,768,1366])test(`control labels keep Korean words together at ${width}`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:844});await page.goto('/batt/');await page.evaluate(()=>document.fonts.ready);
 const issues=await inspect(page,'로그인');await page.getByRole('button',{name:'사용 권한 신청',exact:true}).click();issues.push(...await inspect(page,'가입'));
 await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 for(const mode of ['생산','품질','연구']){
  await page.getByRole('button',{name:mode,exact:true}).click();
  const tabs=page.locator('.console-tabs button');
  for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();issues.push(...await inspect(page,`${mode}/판단 화면 ${i+1}`));}
 }
 for(const name of ['운영 현황','셀 데이터','셀 매칭','팩 · 검사이력','품질 리포트','알고리즘 검증','공정 관리','품질·공정 승인함','사용자 관리']){
  await navigate(page,name);issues.push(...await inspectSteps(page,name));
  if(name==='공정 관리')for(const mode of ['공정 설계 · 데이터 확보','시뮬레이션 · 작업 효율']){await page.getByRole('button',{name:mode,exact:true}).click();issues.push(...await inspectSteps(page,`${name}/${mode}`));}
 }
 expect([...new Set(issues)]).toEqual([]);
});
