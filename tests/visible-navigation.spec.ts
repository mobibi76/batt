import {test,expect} from '@playwright/test';
import {navigate} from './workspace';
for(const width of [1366,390])test(`work destinations are visible buttons at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/batt/');await page.getByRole('button',{name:'등록된 가상 셀로 빠른 체험'}).click();
 for(const task of ['셀 데이터','셀 매칭','품질 리포트','알고리즘 검증','품질·공정 승인함','공정 관리']){
  await navigate(page,task);const nav=page.locator('.visible-task-tabs:visible').last();await expect(nav).toBeVisible();await expect(nav.locator('select')).toHaveCount(0);await expect(page.getByRole('combobox',{name:'현재 작업'})).toHaveCount(0);
  for(const button of await nav.getByRole('button').all()){await expect(button).toBeVisible();const r=(await button.boundingBox())!;expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width);expect(r.height).toBeGreaterThanOrEqual(42);}
 }
 await navigate(page,'셀 데이터');const tabs=page.getByRole('navigation',{name:'작업 단계'});await expect(tabs).toContainText('파일 가져오기');await expect(tabs).toContainText('셀 재고');await expect(tabs).toContainText('측정 분포');await tabs.getByRole('button',{name:'셀 재고',exact:true}).click();await expect(page.getByPlaceholder('셀 ID 또는 LOT 검색')).toBeVisible();
});
