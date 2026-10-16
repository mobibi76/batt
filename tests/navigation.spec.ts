import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test('navigation stays visible and returns from design to inspection evidence',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 for(const [width,height] of [[1440,720],[1366,600],[900,600],[390,640],[320,480]]){await page.setViewportSize({width,height});await expect(page.locator('.sidebar')).toHaveCount(0);const box=await page.getByRole('button',{name:'로그아웃',exact:true}).boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(height);}
 await page.setViewportSize({width:1440,height:720});await navigate(page,'공정 관리');await page.getByRole('button',{name:'설비 상태',exact:true}).click();await expect(page.getByRole('button',{name:'가상 실행',exact:true})).toHaveCount(0);await step(page,'팩 검사 근거');await page.getByRole('button',{name:'팩·검사 근거 확인',exact:true}).click();await expect(page.getByRole('heading',{name:/^(팩 진행 이력|검사·조치 이력)$/})).toBeVisible();await expect(page.locator('.operations-console')).toBeVisible();
});
