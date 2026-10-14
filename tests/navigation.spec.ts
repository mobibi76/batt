import {test,expect} from '@playwright/test';
test('six work destinations fit without sidebar scrolling and monitoring returns to evidence',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 await expect(page.getByRole('navigation',{name:'주요 업무'}).getByRole('button')).toHaveCount(6);
 for(const [width,height] of [[1440,720],[1366,600],[900,600],[390,640],[320,480]]){
  await page.setViewportSize({width,height});
  expect(await page.locator('.sidebar').evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
  for(const nav of await page.locator('.sidebar nav').all())expect(await nav.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
  const last=await page.getByRole('button',{name:'로그아웃',exact:true}).boundingBox();expect(last!.y+last!.height).toBeLessThanOrEqual(height);
 }
 await page.setViewportSize({width:1440,height:720});
 await expect(page.getByRole('heading',{name:'셀 용량 분포'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'한눈에 보는 공정 흐름'})).toBeHidden();
 await page.getByText('공정 흐름·트윈 관제 보기',{exact:true}).click();await page.getByRole('button',{name:'디지털 트윈 관제 열기 · 장비 미연결'}).click();
 await expect(page.getByRole('button',{name:'가상 실행',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'팩·검사 근거 확인',exact:true}).click();await expect(page.locator('.page-heading h1')).toHaveText('팩 · 검사이력');
});
