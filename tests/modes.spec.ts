import {test,expect} from '@playwright/test';
import {navigate} from './workspace';
test('production quality and research own their tools and keep the navigation selected',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 for(const [task,mode,count] of [['셀 매칭','생산',4],['셀 데이터','생산',4],['팩 · 검사이력','품질',4],['품질·공정 승인함','품질',4],['공정 관리','연구',3],['알고리즘 검증','연구',3]] as const){
  await navigate(page,task);await expect(page.getByRole('button',{name:mode,exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('navigation',{name:'작업 선택'}).getByRole('button')).toHaveCount(count);
  await expect(page.locator('.console-tabs button[aria-pressed=true]')).toHaveCount(1);
  await page.getByRole('button',{name:mode+' 홈',exact:true}).click();await expect(page.locator('.console-home-body')).toBeVisible();
 }
});

test('cell inventory searches do not hide packs in quality history',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'셀 데이터');
 const {step}=await import('./workspace');await step(page,'셀 재고');await page.getByPlaceholder('셀 ID 또는 LOT 검색').fill('CELL-SEARCH');
 await navigate(page,'팩 · 검사이력');await expect(page.getByRole('textbox',{name:'팩 일련번호 검색'})).toHaveValue('');await page.getByRole('textbox',{name:'팩 일련번호 검색'}).fill('PACK-SEARCH');
 await navigate(page,'셀 데이터');await step(page,'셀 재고');await expect(page.getByPlaceholder('셀 ID 또는 LOT 검색')).toHaveValue('CELL-SEARCH');
});
