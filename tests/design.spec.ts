// Preserve evidence when a long workflow fails without relaxing assertions.
import {test,expect} from '@playwright/test';
test.use({trace:'retain-on-failure'});
import {navigate,step,researchSide} from './workspace';
for(const width of [1440,900,768,390,320])test('integrated task geometry at '+width,async({page})=>{
 // This scenario visits multiple workspaces; individual actions keep their own limit.
 test.setTimeout(60_000);page.setDefaultTimeout(10_000);
 await page.setViewportSize({width,height:720});await page.goto('/batt/');await page.getByRole('button',{name:'사용 권한 신청',exact:true}).click();await expect(page.getByLabel('이름',{exact:true})).toBeVisible();await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 for(const name of ['운영 현황','셀 데이터','셀 매칭','팩 · 검사이력','품질 리포트','알고리즘 검증','공정 관리','품질·공정 승인함','사용자 관리']){
 await navigate(page,name);await expect(page.locator('.operations-console')).toBeVisible();await expect(page.locator('.sidebar')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 if(name==='운영 현황'&&width>800) await expect(page.locator('.floor-return')).toBeHidden();
 if(name==='셀 데이터') {
  const expand=page.locator('.workspace-expand');
  if(width<=800) await expect(expand).toBeHidden();
  else {
   await expect(expand).toBeVisible();
   const heading=await page.locator('.console-task-heading').boundingBox();
   const button=await expand.boundingBox();
   expect(Math.abs(heading!.x+heading!.width-button!.x-button!.width-12)).toBeLessThanOrEqual(1);
  }
  const tabs=await page.locator('.task-step-selector').boundingBox();
  const panel=await page.locator('.task-step-panel:visible').boundingBox();
  expect(Math.abs(tabs!.x-panel!.x)).toBeLessThanOrEqual(1);
 }
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

 test('pack query filters are separate from the shared ordered process',async({page})=>{
  await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
  for(const mode of ['생산','품질']) {
   await page.getByRole('button',{name:mode,exact:true}).click();
   await page.getByRole('navigation',{name:'작업 선택'}).getByRole('button',{name:mode==='생산'?'팩 진행 이력':'검사·조치 이력',exact:true}).click();
   const queries=page.locator('.workflow-filter .choice-field');
   await expect(queries.getByText('전체 팩',{exact:true})).toBeVisible();
   for(const name of ['불합격 확인','검사 이력 미연결','기존 에이징 기록 대기']) await expect(queries.getByText(name,{exact:true})).toHaveCount(mode==='품질'?1:0);
   const process=page.getByRole('list',{name:'팩 공정 진행 순서'});
   await expect(process.getByRole('button')).toHaveText(['1 · 품질 업무모듈 검사 대기','2 · 생산 업무케이싱 확인 대기','3 · 품질 업무최종검사 기록 대기','4 · 생산 업무품질 검토 요청 가능','5 · 품질 업무최종 승인 대기','6 · 품질 업무품질 승인 완료']);
   await process.getByRole('button',{name:'모듈 검사 대기',exact:true}).click();
   await expect(process.getByRole('button',{name:'모듈 검사 대기',exact:true})).toHaveAttribute('aria-pressed','true');
   await queries.getByText('전체 팩',{exact:true}).click();
   await expect(process.locator('[aria-pressed=true]')).toHaveCount(0);
  }
 });

for(const width of [1366,390])test('content spacing and gutters at '+width,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 for(const [task,panel,body] of [['품질 리포트','.outcome-review','.workbench-body'],['품질·공정 승인함','.task-step-panel:visible > .panel','.approval-submit']]) {
  await navigate(page,task);
  if(task==='품질 리포트')await step(page,'품질 비교');
  if(task==='품질·공정 승인함')await step(page,'새 검토 요청');
  const root=page.locator(panel).first(), content=root.locator(body).first();
  await expect(content).toBeVisible();
  const spacing=await content.evaluate(el=>{const children=[...el.children].filter(c=>c.getBoundingClientRect().height>0);return children.slice(1).map((c,i)=>c.getBoundingClientRect().top-children[i].getBoundingClientRect().bottom);});
  for(const gap of spacing)expect(gap).toBeGreaterThanOrEqual(12);
  const heading=await root.locator('.section-head h2').first().boundingBox();
  const first=await content.locator(':scope > *').first().boundingBox();
  expect(Math.abs(heading!.x-first!.x)).toBeLessThanOrEqual(1);
  await page.screenshot({path:'.local/spacing-'+task+'-'+width+'.png'});
  const details=content.locator('details').first();
  if(await details.count()){await details.locator('summary').first().click();await page.screenshot({path:'.local/spacing-open-'+task+'-'+width+'.png'});}
 }
 await navigate(page,'알고리즘 검증');const workspace=page.locator('.task-step-panel:visible .field-study-workspace');await expect(workspace).toBeVisible();await expect(workspace.locator('.field-study-analysis')).toBeVisible();await researchSide(page,'controls');await expect(workspace.locator('.field-study-controls')).toBeVisible();expect(await workspace.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await step(page,'2. 비교 조건');await researchSide(page,'controls');
 if(width===390){const gaps=await page.locator('.research-controls').evaluate(el=>[...el.children].slice(1).map((c,i)=>c.getBoundingClientRect().top-el.children[i].getBoundingClientRect().bottom));for(const gap of gaps)expect(gap).toBeGreaterThanOrEqual(12);}
 await page.screenshot({path:'.local/spacing-research-form-'+width+'.png'});
});

test('expanded field reference leaves customer import reachable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await navigate(page,'셀 데이터');await step(page,'고객 자료 검토');
 await page.getByText('실제 공정과 품질 기준 확인 · 2026-10-16',{exact:true}).click();
 const upload=page.getByRole('button',{name:'고객 측정 파일 가져오기',exact:true});await upload.scrollIntoViewIfNeeded();await expect(upload).toBeInViewport();
 await page.screenshot({path:'.local/spacing-expanded-evidence-scroll.png'});
});

for(const width of [1366,1024,390])test('studio tools retain clear edges and aligned actions at '+width,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await navigate(page,'공정 관리');
 for(const tab of ['장비·공정','확보 데이터','저장·승인']){
  await page.getByRole('button',{name:tab,exact:true}).click();const panel=page.locator('.designer-inspector:visible');
  const edges=await panel.evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const b=e.getBoundingClientRect();return {left:b.left-r.left,right:r.right-b.right};});});
  for(const edge of edges){expect(edge.left).toBeGreaterThanOrEqual(11);expect(edge.right).toBeGreaterThanOrEqual(11);}
  const boxes=await panel.locator('.workflow-actions > button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top).toBe(true);}
  await panel.screenshot({path:'.local/studio-'+tab+'-'+width+'.png'});
 }
});