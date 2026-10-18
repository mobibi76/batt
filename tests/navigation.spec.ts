import {test,expect} from '@playwright/test';
import {navigate} from './workspace';
test('navigation stays visible and returns from design to inspection evidence',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 for(const [width,height] of [[1440,720],[1366,600],[900,600],[390,640],[320,480]]){await page.setViewportSize({width,height});await expect(page.locator('.sidebar')).toHaveCount(0);const box=await page.getByRole('button',{name:'로그아웃',exact:true}).boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(height);}
 await page.setViewportSize({width:1440,height:720});await navigate(page,'공정 관리');await page.getByRole('button',{name:'시뮬레이션 · 작업 효율',exact:true}).click();await expect(page.getByLabel('목표 생산 수량')).toBeVisible();await navigate(page,'팩 · 검사이력');await expect(page.locator('.console-task-heading').getByRole('heading',{name:'검사·조치 이력',exact:true})).toBeVisible();await expect(page.locator('.operations-console')).toBeVisible();
});
