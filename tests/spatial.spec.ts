import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
for(const [width,height] of [[1366,768],[1024,600],[768,1024],[390,844]])test(`spatial tools fit and preserve canvas at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'공정 관리');
 const canvas=await page.locator('.studio-scene canvas').elementHandle();
 for(const tool of ['장비 블록','선택 장비 · 데이터 정의']){
  await step(page,tool);await expect(page.locator('.studio-panel:visible')).toHaveCount(1);
  if(tool==='선택 장비 · 데이터 정의')for(const tab of ['장비','배치·주기','수치 태그']){await page.getByRole('button',{name:tab,exact:true}).click();expect(await page.locator('.studio-panel:visible').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);}
  else expect(await page.locator('.studio-panel:visible').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
  expect(await canvas!.evaluate(e=>e===document.querySelector('.studio-scene canvas'))).toBe(true);
  if(width>=900){const a=await page.locator('.studio-scene').boundingBox(),b=await page.locator('.studio-inspector').boundingBox();expect(a!.x+a!.width).toBeLessThanOrEqual(b!.x);expect(Math.abs(a!.y-b!.y)).toBeLessThan(1);}
 }
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('property tabs preserve draft values and equipment selection opens its inspector',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'공정 관리');await step(page,'장비 목록에서 선택');await page.locator('.twin-device').first().click();await expect(page.getByRole('navigation',{name:'공정 작업 선택'}).getByRole('button',{name:'선택 장비 · 데이터 정의',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('장비 이름',{exact:true}).fill('새 공정 리더');await page.getByRole('button',{name:'수치 태그',exact:true}).click();await page.getByRole('button',{name:'장비·데이터 적용'}).click();await page.getByRole('button',{name:'장비',exact:true}).click();await expect(page.getByLabel('장비 이름',{exact:true})).toHaveValue('새 공정 리더');await expect(page.locator('.studio-scene canvas')).toBeVisible();await expect(page.getByRole('button',{name:'가상 실행',exact:true})).toHaveCount(0);
});
test('invalid hidden property reveals the field without dropping its draft',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'공정 관리');await step(page,'선택 장비 · 데이터 정의');await page.getByLabel('장비 이름',{exact:true}).fill('');await page.getByRole('button',{name:'수치 태그',exact:true}).click();await page.getByRole('button',{name:'장비·데이터 적용'}).click();await expect(page.getByLabel('장비 이름',{exact:true})).toBeFocused();await expect(page.getByLabel('장비 이름',{exact:true})).toHaveValue('');
});
test('compact simulation controls operate without moving away from the scene',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'공정 관리');await page.getByRole('button',{name:'시뮬레이션',exact:true}).click();await page.getByRole('button',{name:'공정 조작',exact:true}).click();await page.getByRole('button',{name:'1초 진행',exact:true}).click();await expect(page.getByRole('button',{name:'공정 조작',exact:true})).toHaveAttribute('aria-expanded','false');await expect(page.locator('.studio-scene canvas')).toBeVisible();await step(page,'모의 처리량·실행 기록');await expect(page.getByTestId('twin-tick')).toContainText('1초');await page.getByRole('button',{name:'공정 공간',exact:true}).click();await expect(page.locator('.studio-scene canvas')).toBeVisible();
});
