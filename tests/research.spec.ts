import {navigate,step} from './workspace';
﻿import {test,expect} from '@playwright/test';

test('public-data experiments are reproducible, exported, persisted and isolated from operations',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'등록된 가상 셀로 빠른 체험'}).click();
 await page.getByRole('button',{name:'생산',exact:true}).click();const before=await page.locator('.floor-context-heading').innerText();
 await navigate(page,'알고리즘 검증');
 await expect(page.locator('.research-lab button').filter({hasText:'알고리즘 비교 실행'})).toBeDisabled();
 await page.getByRole('button',{name:'UConn 공개 데이터 불러오기'}).click();
 await expect(page.locator('.research-dataset')).toContainText('55셀');
 await step(page,'2. 비교 조건');await page.getByRole('button',{name:'알고리즘 비교 실행'}).click();
 await expect(page.getByRole('heading',{name:'3. 검증 결과'})).toBeVisible();
 await expect(page.locator('.research-cohort')).toHaveCount(3);
 await expect(page.locator('.research-cohort tbody tr')).toHaveCount(9);
 const results=await page.locator('.research-cohort tbody tr').first().innerText();expect(results).toContain('무작위 순서 조합');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'검증 보고서 내려받기'}).click();const dl=await downloadPromise;
 expect(dl.suggestedFilename()).toMatch(/JSI_연구검증_.*\.json/);
 const stream=await dl.createReadStream();const chunks=[];for await(const c of stream!)chunks.push(c);const report=JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\ufeff/,''));
 expect(report.dataset.cells).toHaveLength(55);expect(report.results).toHaveLength(3);expect(report.dataset_sha256).toMatch(/^[a-f0-9]{64}$/);expect(report.promotion.status).toContain('운영 미적용');
 await page.getByRole('button',{name:'생산',exact:true}).click();expect(await page.locator('.floor-context-heading').innerText()).toBe(before);
 await navigate(page,'알고리즘 검증');await expect(page.locator('.research-history button')).toHaveCount(1);await step(page,'최근 실험');await page.locator('.research-history button').click();await expect(page.getByRole('heading',{name:'3. 검증 결과'})).toBeVisible();await step(page,'2. 비교 조건');await expect(page.getByRole('button',{name:'알고리즘 비교 실행'})).toBeEnabled();await expect(page.getByLabel('재현 시드')).toHaveValue('20261014');
 await page.setViewportSize({width:390,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('research upload requires provenance and rejects invalid input',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'등록된 가상 셀로 빠른 체험'}).click();await navigate(page,'알고리즘 검증');await page.getByText('추가 연구 CSV 가져오기',{exact:true}).click();
 const file={name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('id,cohort,voltage_mv,resistance_mohm,capacity_mah\na,test,3300,20,1200')};
 await page.locator('.research-import input[type=file]').setInputFiles(file);await expect(page.getByRole('alert')).toContainText('출처·이용 조건');
 await page.getByLabel('데이터 출처').fill('https://example.org/research');await page.getByLabel('라이선스·이용 조건').fill('internal test');await page.getByLabel('측정 조건·전처리 설명').fill('test cohort');
 await page.locator('.research-import input[type=file]').setInputFiles(file);await expect(page.getByRole('alert')).toContainText('8~300');
 await step(page,'2. 비교 조건');await expect(page.getByRole('button',{name:'알고리즘 비교 실행'})).toBeDisabled();
});
