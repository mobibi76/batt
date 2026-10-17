import {test,expect} from '@playwright/test';
import {choose} from './chips';
import {planningLayout} from '../src/twin/planning';
async function open(page:any){await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();await page.getByRole('button',{name:'연구',exact:true}).click();await page.getByRole('button',{name:'공정 설계·시뮬레이션',exact:true}).click();await expect(page.locator('.process-designer')).toBeVisible();}
test('design data, compare efficiency, independently approve and share with production and quality',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await open(page);
 await page.getByLabel('장비 이름',{exact:true}).fill('검증 충방전 장비');
 await page.getByRole('button',{name:'확보 데이터',exact:true}).click();await page.getByLabel('온도',{exact:true}).check();await expect(page.locator('.designer-coverage')).toContainText('미계획');
 await page.screenshot({path:'.local/process-planning-design.png',fullPage:true});
 await page.getByRole('button',{name:'시뮬레이션 · 작업 효율',exact:true}).click();await expect(page.locator('.designer-metrics')).toContainText('전체 16팩 완료');
 await page.getByRole('button',{name:'현재 안을 비교 기준으로 고정'}).click();await page.getByLabel('자동 처리시간 (분)',{exact:true}).fill('600');await expect(page.locator('.designer-inspector')).toContainText('단축');
 await page.screenshot({path:'.local/process-planning-simulation.png',fullPage:true});
 await page.getByRole('button',{name:'공정 설계 · 데이터 확보',exact:true}).click();await page.getByRole('button',{name:'저장·승인',exact:true}).click();await page.getByLabel('공정 버전 이름').fill('생산 반영 검증 공정');await page.getByLabel('변경 이유와 검토 사항').fill('시간과 확보 데이터 검토');await page.getByRole('button',{name:'공정 승인 요청',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'검토 요청을 제출'})).toBeVisible();await page.getByRole('button',{name:'공정 승인함',exact:true}).click();
 await choose(page,'체험 역할','demo-reviewer');await page.getByLabel('검토 의견').fill('데이터와 작업 조건 확인');await page.getByRole('button',{name:'제출본 승인',exact:true}).click();await expect(page.locator('.approval-detail .approval-status.approved')).toContainText('승인');
 for(const mode of ['생산','품질']){await page.getByRole('button',{name:mode,exact:true}).click();await expect(page.locator('.floor-scene-caption')).toContainText('생산 반영 검증 공정');await expect(page.getByRole('button',{name:'검증 충방전 장비',exact:true})).toBeVisible();}
 await page.screenshot({path:'.local/process-planning-operational.png',fullPage:true});
});
test('mobile design and simulation remain reachable without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page);
 await page.getByRole('button',{name:'데이터 확보 현황',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:'.local/process-coverage-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'시뮬레이션 · 작업 효율',exact:true}).click();await expect(page.locator('.designer-metrics')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:'.local/process-planning-mobile.png',fullPage:true});
});

test('process diagram and consolidated coverage switch in place',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await open(page);
 expect((await page.locator('.designer-toolbar').boundingBox())!.height).toBeLessThanOrEqual(56);
 await page.screenshot({path:'.local/process-compact-toolbar.png'});
 await expect(page.locator('.designer-canvas .twin-viewport')).toBeInViewport({ratio:1});
 await page.getByRole('button',{name:'공정도 확대',exact:true}).click();
 await expect(page.locator('.designer-canvas .twin-viewport')).toBeInViewport({ratio:1});
 await page.screenshot({path:'.local/process-expanded.png'});
 await page.getByRole('button',{name:'확대 닫기',exact:true}).press('Escape');
 await expect(page.locator('.process-designer')).not.toHaveClass(/designer-expanded/);
 const y=await page.locator('.process-designer').evaluate(e=>e.scrollTop);
 await page.getByRole('button',{name:'데이터 확보 현황',exact:true}).click();
 expect(await page.locator('.process-designer').evaluate(e=>e.scrollTop)).toBe(y);
 await expect(page.locator('.coverage-matrix tbody tr')).toHaveCount(4);
 await expect(page.locator('.coverage-matrix tbody tr').last()).toBeInViewport({ratio:1});
 const life=page.getByRole('row').filter({hasText:'수명·열화 분석 준비'});
 await expect(life).toContainText('5/9 항목 계획');
 await expect(life.locator('.coverage-missing')).toContainText('온도');
 await page.getByRole('button',{name:'확보 데이터',exact:true}).click();
 await page.getByLabel('온도',{exact:true}).check();
 await expect(life).toContainText('6/9 항목 계획');
 await expect(life.locator('.coverage-missing')).not.toContainText('온도');
 await page.screenshot({path:'.local/process-coverage.png'});
 await expect(page.locator('.coverage-matrix tbody tr').last()).toBeInViewport({ratio:1});
});

for(const viewport of [{width:1366,height:768},{width:1920,height:1080}])test(`process and inspector retain the same height at ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await open(page);
 const canvas=page.locator('.designer-canvas'),inspector=page.locator('.designer-inspector');
 const before=(await canvas.boundingBox())!,right=(await inspector.boundingBox())!;
 expect(Math.abs(before.y-right.y)).toBeLessThan(2);
 expect(Math.abs(before.height-right.height)).toBeLessThan(2);
 await page.getByRole('button',{name:/^작업 순서 \d+$/}).click();
 await inspector.evaluate(e=>e.scrollTop=e.scrollHeight);
 await expect(page.locator('.designer-route li').last()).toBeInViewport({ratio:1});
 expect((await canvas.boundingBox())!.y).toBe(before.y);
 await expect(page.locator('.designer-canvas .twin-viewport')).toBeInViewport({ratio:1});
 expect(await page.locator('.process-designer').evaluate(e=>e.scrollHeight-e.clientHeight)).toBeLessThanOrEqual(1);
 await page.screenshot({path:`.local/process-pane-bottom-${viewport.width}.png`});
});

test('adding and selecting equipment opens its editor with visible removal',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await open(page);
 const equipment=page.getByLabel('편집할 장비',{exact:true});
 const count=await equipment.locator('option').count();
 await page.getByRole('button',{name:'+ 장비 추가',exact:true}).click();
 await page.locator('.designer-library button').first().click();
 await expect(equipment.locator('option')).toHaveCount(count+1);
 await expect(page.getByLabel('장비 이름',{exact:true})).toBeInViewport({ratio:1});
 await page.getByLabel('장비 이름',{exact:true}).fill('추가 장비 편집 확인');
 await expect(page.getByRole('button',{name:'이 장비 삭제',exact:true})).toBeInViewport({ratio:1});
 await page.getByRole('button',{name:'이 장비 삭제',exact:true}).click();
 await expect(equipment.locator('option')).toHaveCount(count);
 await expect(equipment).not.toContainText('추가 장비 편집 확인');
 await page.getByRole('button',{name:'삭제 취소',exact:true}).click();
 await expect(page.getByLabel('장비 이름',{exact:true})).toHaveValue('추가 장비 편집 확인');
 await page.getByRole('button',{name:'이 장비 삭제',exact:true}).click();
 await page.getByRole('button',{name:/^작업 순서 \d+$/}).click();
 await page.locator('.designer-route li').last().getByRole('button').first().click();
 await expect(page.getByLabel('장비 이름',{exact:true})).toHaveValue('최종검사');
 await expect(page.getByLabel('장비 이름',{exact:true})).toBeInViewport({ratio:1});
 await page.screenshot({path:'.local/process-equipment-editor.png'});
 await page.getByLabel('장비 이름',{exact:true}).fill('최종검사 수정');
 await page.getByRole('button',{name:/^작업 순서 \d+$/}).click();
 await page.getByRole('button',{name:'최종검사 수정 앞으로',exact:true}).click();
 await expect(page.locator('.designer-route li').nth(count-2)).toContainText('최종검사 수정');
 await page.getByRole('button',{name:'확보 데이터',exact:true}).click();
 await page.getByLabel('편집할 장비',{exact:true}).selectOption('grading');
 await expect(page.getByRole('heading',{name:'셀 충방전 검사 · 확보 계획',exact:true})).toBeVisible();
 await page.getByLabel('온도',{exact:true}).check();
 await page.getByRole('button',{name:'저장·승인',exact:true}).click();
 await page.getByRole('button',{name:'개인 설계 저장',exact:true}).click();
 const saved=await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('jsi-process-plan-v1-')).map(([,v])=>JSON.parse(v)));
 expect(saved.some(l=>l.devices.some((d:any)=>d.name==='최종검사 수정')&&l.plan.stations.grading.data.includes('temperature'))).toBe(true);

});

for(const viewport of [{width:1366,height:768},{width:900,height:720},{width:390,height:844}])test(`equipment and order round trip retains edits and visible navigation at ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await open(page);
 const editor=page.getByRole('button',{name:'장비 편집',exact:true}),order=page.getByRole('button',{name:/^작업 순서 \d+$/});
 const name=page.getByLabel('장비 이름',{exact:true});
 await name.fill('왕복 검증 장비');
 await page.getByRole('button',{name:'+ 장비 추가',exact:true}).click();
 await expect(page.locator('.designer-library button')).toHaveCount(6);
 await editor.click();
 await expect(name).toHaveValue('왕복 검증 장비');
 await page.getByLabel('장비 모델·사양 근거',{exact:true}).fill('왕복 후 유지할 사양');
 await order.click();
 await expect(name).toHaveCount(0);
 await expect(editor).toBeInViewport({ratio:1});
 await expect(page.getByRole('list',{name:'설계 작업 순서'})).toContainText('왕복 검증 장비');
 await page.getByRole('button',{name:'왕복 검증 장비 뒤로',exact:true}).click();
 await expect(order).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.designer-route li').nth(1)).toContainText('왕복 검증 장비');
 await page.screenshot({path:'.local/order-view-'+viewport.width+'.png'});
 await editor.click();
 await expect(name).toHaveValue('왕복 검증 장비');
 await expect(page.getByLabel('장비 모델·사양 근거',{exact:true})).toHaveValue('왕복 후 유지할 사양');
 await expect(name).toBeInViewport({ratio:1});
 await expect(page.getByRole('button',{name:'이 장비 삭제',exact:true})).toBeInViewport({ratio:1});
 await order.click();
 await page.getByRole('button',{name:'장비·공정',exact:true}).click();
 await expect(name).toHaveValue('왕복 검증 장비');
 await expect(editor).toHaveAttribute('aria-pressed','true');
 await order.click();
 await page.locator('.designer-route li').last().getByRole('button').first().click();
 await expect(editor).toHaveAttribute('aria-pressed','true');
 await expect(name).toHaveValue('최종검사');
 await page.screenshot({path:'.local/order-return-'+viewport.width+'.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('imported chain order and newly appended equipment agree with saved links',async({page})=>{
 await open(page);const layout=planningLayout();layout.devices.reverse();
 await page.getByRole('button',{name:'저장·승인',exact:true}).click();
 await page.locator('.designer-inspector input[type=file]').setInputFiles({name:'unordered.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(layout))});
 await page.getByRole('button',{name:'장비·공정',exact:true}).click();
 await expect(page.getByLabel('편집할 장비',{exact:true}).locator('option').first()).toContainText('셀 충방전 검사');
 await page.getByRole('button',{name:'+ 장비 추가',exact:true}).click();
 await page.getByRole('button',{name:'+ 셀 측정기',exact:true}).click();
 await expect(page.getByRole('button',{name:'장비 편집',exact:true})).toHaveAttribute('aria-pressed','true');
 const added=await page.getByLabel('편집할 장비',{exact:true}).inputValue();
 await page.getByRole('button',{name:'시뮬레이션 · 작업 효율',exact:true}).click();
 await expect(page.locator('.designer-metrics')).toBeVisible();
 await expect(page.locator('.designer-inspector [role=alert]')).toHaveCount(0);
 await page.getByRole('button',{name:'공정 설계 · 데이터 확보',exact:true}).click();
 await page.getByRole('button',{name:'저장·승인',exact:true}).click();
 await page.getByRole('button',{name:'개인 설계 저장',exact:true}).click();
 const saved=await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('jsi-process-plan-v1-')).map(([,v])=>JSON.parse(v)));
 expect(saved[0].links).toEqual([...layout.links,{from:'final',to:added}]);
 expect(saved[0].devices.map((d:any)=>d.id)).toEqual(['grading','storage','assembly','module','casing','final',added]);
});
