import {test,expect} from '@playwright/test';
import {choose} from './chips';
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
 await inspector.evaluate(e=>e.scrollTop=e.scrollHeight);
 await expect(page.locator('.designer-route li').last()).toBeInViewport({ratio:1});
 expect((await canvas.boundingBox())!.y).toBe(before.y);
 await expect(page.locator('.designer-canvas .twin-viewport')).toBeInViewport({ratio:1});
 expect(await page.locator('.process-designer').evaluate(e=>e.scrollHeight-e.clientHeight)).toBeLessThanOrEqual(1);
 await page.screenshot({path:`.local/process-pane-bottom-${viewport.width}.png`});
});

test('adding and selecting equipment opens its editor with visible removal',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await open(page);
 const count=await page.locator('.designer-route li').count();
 await page.locator('.designer-device-tools summary').click();
 await page.locator('.designer-library button').first().click();
 await expect(page.locator('.designer-route li')).toHaveCount(count+1);
 await expect(page.getByLabel('장비 이름',{exact:true})).toBeInViewport({ratio:1});
 await page.getByLabel('장비 이름',{exact:true}).fill('추가 장비 편집 확인');
 await expect(page.getByRole('button',{name:'이 장비 삭제',exact:true})).toBeInViewport({ratio:1});
 await page.getByRole('button',{name:'이 장비 삭제',exact:true}).click();
 await expect(page.locator('.designer-route li')).toHaveCount(count);
 await expect(page.locator('.designer-route')).not.toContainText('추가 장비 편집 확인');
 await page.getByRole('button',{name:'삭제 취소',exact:true}).click();
 await expect(page.getByLabel('장비 이름',{exact:true})).toHaveValue('추가 장비 편집 확인');
 await page.getByRole('button',{name:'이 장비 삭제',exact:true}).click();
 await page.locator('.designer-route li').last().getByRole('button').first().click();
 await expect(page.getByLabel('장비 이름',{exact:true})).toHaveValue('최종검사');
 await expect(page.getByLabel('장비 이름',{exact:true})).toBeInViewport({ratio:1});
 await page.screenshot({path:'.local/process-equipment-editor.png'});
 await page.getByLabel('장비 이름',{exact:true}).fill('최종검사 수정');
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
