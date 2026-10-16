import {prepareInspection} from './inspection';
import {choose} from './chips';
import {navigate,step} from './workspace';
import {test,expect} from '@playwright/test';
test('quality work follows the same pack through confirmation, independent approval and outcomes',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('CONNECTED-QUALITY');await page.getByLabel('조합 검토 사유',{exact:true}).fill('합성 시험 조합 검토');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();
 await page.getByRole('button',{name:'이 팩 검사로 이어가기'}).click();await expect(page.getByRole('dialog')).toHaveAttribute('aria-label','CONNECTED-QUALITY');
 await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await choose(page,'검사 구분','casing');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await choose(page,'검사 구분','final');await choose(page,'판정','fail');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'생산',exact:true}).click();await page.getByRole('button',{name:'생산 작업',exact:true}).click();await expect(page.locator('.console-target')).toContainText('CONNECTED-QUALITY');await expect(page.locator('.console-target')).toContainText('최종검사 불합격');
 await navigate(page,'팩 · 검사이력');await page.getByRole('button',{name:'상세 조회',exact:true}).click();await choose(page,'검사 구분','final');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.getByRole('button',{name:'이 팩 품질 검토 요청',exact:true}).click();
 await expect(page.getByRole('radiogroup',{name:'품질 검토 대상 팩',exact:true}).getByRole('radio',{name:'CONNECTED-QUALITY',exact:true})).toBeChecked();
 await page.getByLabel('검토 요청 사유',{exact:true}).fill('재검사 근거 확인 후 최종 승인 요청');await page.getByRole('button',{name:'팩 품질 검토 요청'}).click();await choose(page,'체험 역할','demo-reviewer');await page.getByLabel('검토 의견').fill('공정 확인 및 재검사 결과 확인');await page.getByRole('button',{name:'제출본 승인',exact:true}).click();await page.getByRole('button',{name:'품질 결과 확인',exact:true}).click();
 await expect(page.locator('.outcome-comparison article').nth(0)).toContainText('100%');await expect(page.locator('.outcome-comparison article').nth(1)).toContainText('0%');
 await navigate(page,'팩 · 검사이력');await expect(page.getByRole('row').filter({hasText:'CONNECTED-QUALITY'})).toContainText('품질 승인 완료');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:720});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
test('quality drilldown filters the affected records rather than opening an unrelated list',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await navigate(page,'품질 리포트');await step(page,'품질 비교');await page.getByRole('button',{name:'누락된 결과 연결'}).click();await expect(page.getByRole('radiogroup',{name:'조회 조건 · 품질 기록 관리',exact:true}).locator('input[value="unlinked"]')).toBeChecked();
 await page.getByRole('button',{name:'전체 팩 보기'}).click();await expect(page.getByRole('radiogroup',{name:'조회 조건 · 품질 기록 관리',exact:true}).locator('input[value="all"]')).toBeChecked();
});
