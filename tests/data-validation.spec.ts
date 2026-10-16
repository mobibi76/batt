import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test('data validation explains the reference, identifies gaps and exports isolated evidence',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'등록된 가상 셀로 빠른 체험'}).click();await navigate(page,'알고리즘 검증');await step(page,'데이터 검증');
 const panel=page.locator('.data-validation');await expect(panel).toContainText('10·100사이클');await panel.getByRole('button',{name:'내 데이터 검사',exact:true}).click();
 await panel.getByRole('button',{name:'누락이 있는 합성 예제로 확인'}).click();await expect(panel).toContainText('합성 예제 · 실측 아님');await expect(panel).toContainText('공통 전압 좌표');
 const pending=page.waitForEvent('download');await panel.getByRole('button',{name:'보고서',exact:true}).click();const file=await pending;const chunks=[];for await(const c of (await file.createReadStream())!)chunks.push(c);
 const report=JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\ufeff/,''));expect(report.source_kind).toBe('synthetic-example');expect(report.file_sha256).toMatch(/^[a-f0-9]{64}$/);expect(report.result.counts.missing).toBeGreaterThan(0);expect(report.result.reference.scope).toContain('성능 인증');
 for(const width of [1366,390,320]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/validation-${width}.png`});await expect(panel.locator('.validation-finding')).toBeInViewport({ratio:1});await expect(panel.locator('.validation-pagination')).toBeInViewport({ratio:1});}
 await panel.getByRole('radio',{name:'파일 검사',exact:true}).check();await panel.getByLabel('데이터 검증 CSV',{exact:true}).setInputFiles({name:'capacity-only.csv',mimeType:'text/csv',buffer:Buffer.from('cell_id,capacity_mah\nA,1000')});await expect(panel).toContainText('capacity-only.csv');await expect(panel.locator('.validation-finding')).toContainText('cycle 컬럼 없음');
 await panel.getByRole('radio',{name:'파일 검사',exact:true}).check();await panel.getByLabel('데이터 검증 CSV',{exact:true}).setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('cell_id,cell_id\nA,B')});await expect(panel.getByRole('alert')).toBeVisible();await panel.getByRole('radio',{name:'비교 결과',exact:true}).check();await expect(panel.getByRole('button',{name:'보고서',exact:true})).toHaveCount(0);
 await step(page,'공개 모델 추론');await expect(page.getByRole('button',{name:'공개 모델 실행',exact:true})).toBeVisible();
});
