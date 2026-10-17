import {prepareInspection} from './inspection';
import {choose} from './chips';
import {test,expect,type Page} from '@playwright/test';
import {navigate,step,researchSide} from './workspace';
test.use({actionTimeout:10_000,trace:'retain-on-failure'});
async function start(page:Page){await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();}
async function shell(page:Page){await expect(page.getByRole('region',{name:'생산·품질·연구 작업대'})).toBeVisible();await expect(page.locator('.sidebar,.topbar')).toHaveCount(0);await expect(page.getByRole('button',{name:'운영 지표',exact:true})).toHaveCount(0);}
async function pack(page:Page){await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).filter({visible:true}).click();await page.getByLabel('팩 일련번호').fill('UNIFIED-001');await page.getByLabel('조합 검토 사유',{exact:true}).fill('합성 시험 조합 검토');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();}
test('all tools stay in one workspace without legacy navigation',async({page})=>{
 // Eight round trips share the scenario budget; each action still has a 10s limit.
 test.setTimeout(60_000);
 await start(page);
 for(const name of ['셀 데이터','셀 매칭','팩 · 검사이력','품질 리포트','알고리즘 검증','공정 관리','품질·공정 승인함','사용자 관리']){await navigate(page,name);await shell(page);await expect(page.locator('.console-task-body')).toBeVisible();await page.getByRole('button',{name:/^(생산|품질|연구) 홈$/}).click();await expect(page.locator('.console-home-body')).toBeVisible();}
});
test('import and sample download complete in control',async({page})=>{
 await start(page);await navigate(page,'셀 데이터');await step(page,'측정 파일로 시작하세요');const download=page.waitForEvent('download');await page.getByRole('button',{name:'샘플 양식'}).click();expect((await download).suggestedFilename()).toContain('.csv');
 await page.locator('.upload-actions input[type=file]').setInputFiles('tests/fixtures/sample.xlsx');await expect(page.getByRole('dialog')).toContainText('형식 검증 완료');await page.getByRole('button',{name:'전체 1개 등록'}).click();await step(page,'셀 재고');await page.getByPlaceholder('셀 ID 또는 LOT 검색').fill('XLSX-QA-001');await expect(page.getByRole('cell',{name:'XLSX-QA-001 합성값',exact:true})).toBeVisible();await shell(page);
});
test('field inspections flow into independent control approval and reinspection revokes approval',async({page})=>{
 // Four inspections and review span several workspaces; each action still has a 10s limit.
 test.setTimeout(60_000);
 await start(page);await pack(page);await page.getByRole('button',{name:/^(생산|품질|연구) 홈$/}).click();await page.getByRole('button',{name:'생산 작업',exact:true}).click();
 for(const kind of ['module','casing','final']){await page.getByRole('button',{name:'검사 확인·기록'}).click();await choose(page,'검사 구분',kind);await prepareInspection(page);await page.getByRole('button',{name:'검사 메모·저장으로'}).click();await prepareInspection(page,true);await page.getByLabel('검사 메모',{exact:true}).fill('검사 기준 확인');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();}
 await navigate(page,'품질·공정 승인함');await step(page,'새 검토 요청');await choose(page,'품질 검토 대상 팩',{label:'UNIFIED-001'});await page.getByLabel('검토 요청 사유',{exact:true}).fill('두 공정 검사 근거 제출');await page.getByRole('button',{name:'팩 품질 검토 요청'}).click();await expect(page.locator('.approval-detail')).toContainText('본인이 제출한 요청');
 await choose(page,'체험 역할','demo-admin');await expect(page.getByLabel('검토 의견')).toHaveCount(0);
 await choose(page,'체험 역할','demo-reviewer');await page.getByLabel('검토 의견').fill('독립 검토 완료');await page.getByRole('button',{name:'제출본 승인',exact:true}).click();await expect(page.locator('.approval-detail > .section-head .approval-status.approved')).toBeVisible();await shell(page);
 await navigate(page,'팩 · 검사이력');await page.getByRole('button',{name:'상세 조회',exact:true}).click();await prepareInspection(page);await choose(page,'검사 구분','final');await choose(page,'판정','fail');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await navigate(page,'품질·공정 승인함');await expect(page.locator('.approval-status.superseded')).toContainText('재검토 필요');
});
test('research executes in control and exports isolated evidence',async({page})=>{
 await start(page);await navigate(page,'알고리즘 검증');await researchSide(page,'controls');await page.getByRole('button',{name:'현재 측정·판정 자료 가져오기'}).click();await expect(page.locator('.task-step-panel:visible .field-data-summary')).toContainText('원자료 128행');await step(page,'2. 비교 조건');await researchSide(page,'controls');await page.getByRole('button',{name:'알고리즘 비교 실행'}).click();await expect(page.getByRole('heading',{name:'3. 검증 결과'})).toBeVisible();await researchSide(page,'evidence');await page.locator('.research-cohort > summary').click();await expect(page.locator('.research-cohort table')).toBeVisible();await page.locator('.research-cohort tbody tr').first().scrollIntoViewIfNeeded();await expect(page.locator('.research-cohort tbody tr').first()).toBeInViewport();await expect(page.locator('.research-cohort tbody tr')).toHaveCount(12);await researchSide(page,'controls');const download=page.waitForEvent('download');await page.getByRole('button',{name:'검증 보고서 내려받기'}).click();expect((await download).suggestedFilename()).toContain('.json');await shell(page);
});
test('process planning estimates efficiency without synthetic production records',async({page})=>{
 await start(page);await navigate(page,'공정 관리');await expect(page.locator('.designer-canvas canvas')).toBeVisible();await expect(page.getByRole('button',{name:'가상 실행',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'시뮬레이션 · 작업 효율',exact:true}).click();await expect(page.locator('.designer-metrics')).toContainText('전체 16팩');await shell(page);
});
