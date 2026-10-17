import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test('planning does not present estimates as live equipment or quality readings',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await navigate(page,'공정 관리');await expect(page.locator('.twin-readings')).toHaveCount(0);
 for(const mode of ['공정 설계 · 데이터 확보','시뮬레이션 · 작업 효율'])for(const width of [1440,390,320]){await page.getByRole('button',{name:mode,exact:true}).click();await page.setViewportSize({width,height:720});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
