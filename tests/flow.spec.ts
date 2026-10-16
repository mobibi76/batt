import {prepareInspection} from './inspection';
import {choose} from './chips';
import {navigate,step} from './workspace';
import {test,expect} from '@playwright/test';
test('demo process map follows approval and inspection records',async({page})=>{
 await page.goto('/batt/');
 await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();

 await expect(page.locator('.console-scene canvas')).toBeVisible();
 await navigate(page,'셀 매칭');
 await page.getByRole('button',{name:'조합 추천',exact:true}).click();
 await expect(page.locator('.candidate')).toHaveCount(3);
 await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();
 await page.getByRole('textbox',{name:'팩 일련번호'}).fill('TEST-PACK-001');
 await page.getByLabel('조합 검토 사유',{exact:true}).fill('합성 시험 조합 검토');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();
 await navigate(page,'팩 · 검사이력');
 await page.getByRole('button',{name:'상세 조회'}).click();
 await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장'}).click();
 await choose(page,'검사 구분','casing');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장'}).click();
 await choose(page,'검사 구분','final');
 await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장'}).click();
 await expect(page.locator('.inspection-list .badge').filter({hasText:'합격'})).toHaveCount(3);
});
test('imports XLSX and rejects malformed CSV before upload',async({page})=>{
 await page.goto('/batt/');
 await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 await navigate(page,'셀 매칭');await navigate(page,'셀 데이터');
 await page.locator('.upload-actions input[type=file]').setInputFiles('tests/fixtures/sample.xlsx');
 await expect(page.getByRole('dialog').getByText('형식 검증 완료')).toBeVisible();
 await page.getByRole('button',{name:'전체 1개 등록'}).click();
 await step(page,'셀 재고');await page.getByPlaceholder('셀 ID 또는 LOT 검색').fill('XLSX-QA-001');
 await expect(page.getByRole('cell',{name:'XLSX-QA-001 합성값',exact:true})).toBeVisible();
 await step(page,'측정 파일로 시작하세요');await page.locator('.upload-actions input[type=file]').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at\nBAD,LOT,nope,0.42,30000,2026-10-14')});
 await expect(page.getByRole('dialog').getByRole('button',{name:'전체 1개 등록'})).toBeDisabled();
});
