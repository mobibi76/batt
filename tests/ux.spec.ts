import {test,expect} from '@playwright/test';

test('monitoring never presents a simulation as live equipment and leaving simulation pauses it',async({page})=>{
 await page.goto('/batt/');
 await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 await expect(page.locator('.throughput-grid')).not.toBeVisible();
 await expect(page.locator('.quality-priorities')).toBeVisible();
 await page.getByRole('navigation').getByRole('button',{name:'가상 디지털 트윈',exact:true}).click();
 await expect(page.getByRole('heading',{name:'실제 장비 미연결'})).toBeVisible();
 await expect(page.getByRole('button',{name:'가상 실행',exact:true})).toHaveCount(0);
 await expect(page.locator('.twin-readings')).toHaveCount(0);
 await page.getByRole('button',{name:'공정 구성',exact:true}).click();
 await page.getByRole('button',{name:'90° 회전'}).click();
 await page.getByRole('button',{name:'시뮬레이션',exact:true}).click();
 await expect(page.getByRole('heading',{name:'실행 전',exact:true})).toBeVisible();
 await page.getByText('모의 처리량·실행 기록',{exact:true}).click();
 await page.getByRole('button',{name:'가상 실행',exact:true}).click();
 await expect(page.getByTestId('twin-tick')).not.toContainText('0초');
 await page.getByRole('button',{name:'관제',exact:true}).click();
 await expect(page.getByRole('heading',{name:'실제 장비 미연결'})).toBeVisible();
 await expect(page.locator('.twin-readings')).toHaveCount(0);
 await page.getByRole('button',{name:'시뮬레이션',exact:true}).click();
 await expect(page.getByRole('button',{name:'가상 실행',exact:true})).toBeVisible();
 const tick=await page.getByTestId('twin-tick').textContent();
 await page.waitForTimeout(1200);
 expect(await page.getByTestId('twin-tick').textContent()).toBe(tick);
 for(const mode of ['관제','공정 구성','시뮬레이션'])for(const width of [1440,390,320]){
  await page.getByRole('button',{name:mode,exact:true}).click();await page.setViewportSize({width,height:720});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
