import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test('public pretrained inference runs explicitly, exports provenance and fits small screens',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 await navigate(page,'알고리즘 검증');await step(page,'공개 모델 추론');const panel=page.locator('.pretrained-explorer');
 await expect(panel).toContainText('추가 학습 없음');await expect(panel.locator('.pretrained-metrics')).toHaveCount(0);
 await panel.getByRole('button',{name:'공개 모델 실행',exact:true}).click();await expect(panel).toContainText('1,127.1 mAh');
 const pending=page.waitForEvent('download');await panel.getByRole('button',{name:'추론 결과·출처 내려받기'}).click();const file=await pending;
 const chunks=[];for await(const c of (await file.createReadStream())!)chunks.push(c);
 const report=JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\ufeff/,''));
 expect(report.results).toHaveLength(112);expect(report.model.license).toBe('MIT');expect(report.results[0].outputCalibration).toBe('none');expect(report.scope).toContain('현장 승인 아님');
 for(const width of [1366,390,320]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await panel.locator('.pretrained-metrics').scrollIntoViewIfNeeded();await expect(panel.locator('.pretrained-metrics')).toBeInViewport();await page.screenshot({path:`test-results/pretrained-${width}.png`});}
 await panel.locator('summary').filter({hasText:'비교 기록 선택'}).click();await panel.getByRole('radio').nth(1).check();await expect(panel).toContainText('b1:6-1:rpt42');
 await step(page,'Severson 열화 이력');await expect(page.locator('.severson-chart')).toBeVisible();
});
