import {test,expect} from '@playwright/test';
import {navigate} from './workspace';
for(const [width,height] of [[1366,768],[1024,600],[768,1024],[390,844],[320,720]])test(`planning tools remain accessible at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await navigate(page,'공정 관리');const canvas=await page.locator('.designer-canvas canvas').elementHandle();
 await page.getByLabel('장비 이름',{exact:true}).fill('공정 초안');for(const panel of ['확보 데이터','저장·승인','장비·공정']){await page.getByRole('button',{name:panel,exact:true}).click();expect(await canvas!.evaluate(e=>e===document.querySelector('.designer-canvas canvas'))).toBe(true);}await expect(page.getByLabel('장비 이름',{exact:true})).toHaveValue('공정 초안');
 await page.getByRole('button',{name:'시뮬레이션 · 작업 효율',exact:true}).click();await page.getByLabel('목표 생산 수량').scrollIntoViewIfNeeded();await expect(page.getByLabel('목표 생산 수량')).toBeInViewport();await page.getByLabel('목표 생산 수량').fill('32');await expect(page.locator('.designer-metrics')).toContainText('전체 32팩');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
