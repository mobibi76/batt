import {choose} from './chips';
import {test,expect,type Page} from '@playwright/test';
import {navigate,step} from './workspace';
async function start(page:Page){await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();}
async function shell(page:Page){await expect(page.getByRole('region',{name:'현장·관제 통합 작업대'})).toBeVisible();await expect(page.locator('.sidebar,.topbar')).toHaveCount(0);await expect(page.getByRole('button',{name:'운영 지표',exact:true})).toHaveCount(0);}
async function pack(page:Page){await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).filter({visible:true}).click();await page.getByLabel('팩 일련번호').fill('UNIFIED-001');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();}
test('all tools stay in one workspace without legacy navigation',async({page})=>{
 await start(page);
 for(const name of ['셀 데이터','셀 매칭','팩 · 검사이력','품질 리포트','알고리즘 검증','공정 관리','품질·공정 승인함','사용자 관리']){await navigate(page,name);await shell(page);await expect(page.locator('.console-task-body')).toBeVisible();await page.getByRole('button',{name:'판단 화면으로'}).click();await expect(page.locator('.console-home-body')).toBeVisible();}
});
test('import and sample download complete in control',async({page})=>{
 await start(page);await navigate(page,'셀 데이터');const download=page.waitForEvent('download');await page.getByRole('button',{name:'샘플 양식'}).click();expect((await download).suggestedFilename()).toContain('.csv');
 await page.locator('.upload-actions input[type=file]').setInputFiles('tests/fixtures/sample.xlsx');await expect(page.getByRole('dialog')).toContainText('형식 검증 완료');await page.getByRole('button',{name:'전체 1개 등록'}).click();await step(page,'셀 재고');await page.getByPlaceholder('셀 ID 또는 LOT 검색').fill('XLSX-QA-001');await expect(page.getByRole('cell',{name:'XLSX-QA-001',exact:true})).toBeVisible();await shell(page);
});
test('field inspections flow into independent control approval and reinspection revokes approval',async({page})=>{
 await start(page);await pack(page);await page.getByRole('button',{name:'판단 화면으로'}).click();await page.getByRole('button',{name:'확인·조치',exact:true}).click();await page.getByRole('button',{name:'첫 대상 확인'}).click();
 for(const kind of ['aging','final']){await page.getByRole('button',{name:'검사 확인·기록'}).click();await choose(page,'검사 구분',kind);await page.getByRole('button',{name:'검사 메모·저장으로'}).click();await page.getByLabel('검사 메모',{exact:true}).fill('검사 기준 확인');await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();}
 await navigate(page,'품질·공정 승인함');await step(page,'새 검토 요청');await choose(page,'품질 검토 대상 팩',{label:'UNIFIED-001'});await page.getByLabel('검토 요청 사유',{exact:true}).fill('두 공정 검사 근거 제출');await page.getByRole('button',{name:'팩 품질 검토 요청'}).click();await expect(page.locator('.approval-detail')).toContainText('본인이 제출한 요청');
 await choose(page,'체험 역할','demo-admin');await expect(page.getByLabel('검토 의견')).toHaveCount(0);
 await choose(page,'체험 역할','demo-reviewer');await page.getByLabel('검토 의견').fill('독립 검토 완료');await page.getByRole('button',{name:'제출본 승인',exact:true}).click();await expect(page.locator('.approval-detail > .section-head .approval-status.approved')).toBeVisible();await shell(page);
 await navigate(page,'팩 · 검사이력');await page.getByRole('button',{name:'상세 조회',exact:true}).click();await choose(page,'검사 구분','final');await choose(page,'판정','fail');await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await navigate(page,'품질·공정 승인함');await expect(page.locator('.approval-status.superseded')).toContainText('재검토 필요');
});
test('research executes in control and exports isolated evidence',async({page})=>{
 await start(page);await navigate(page,'알고리즘 검증');await page.getByRole('button',{name:'UConn 공개 데이터 불러오기'}).click();await expect(page.locator('.research-dataset')).toContainText('55셀');await step(page,'2. 비교 조건');await page.getByRole('button',{name:'알고리즘 비교 실행'}).click();await expect(page.getByRole('heading',{name:'3. 검증 결과'})).toBeVisible();await expect(page.locator('.research-cohort tbody tr')).toHaveCount(9);const download=page.waitForEvent('download');await page.getByRole('button',{name:'검증 보고서 내려받기'}).click();expect((await download).suggestedFilename()).toContain('.json');await shell(page);
});
test('process design stays idle until explicit simulation',async({page})=>{
 await start(page);await navigate(page,'공정 관리');await expect(page.locator('.twin-stage canvas')).toBeVisible();await expect(page.getByRole('button',{name:'가상 실행',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'시뮬레이션',exact:true}).click();await step(page,'모의 처리량·실행 기록');await expect(page.getByTestId('twin-tick')).toContainText('0');await page.getByRole('button',{name:'1초 진행',exact:true}).click();await expect(page.getByTestId('twin-tick')).toContainText('1');await shell(page);
});
