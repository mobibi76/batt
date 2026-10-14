import {test,expect} from '@playwright/test';
import {navigate} from './workspace';
test('field and control own their actual tools',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 await navigate(page,'셀 매칭');await expect(page.getByRole('button',{name:'현장',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('navigation',{name:'작업 선택'}).getByRole('button')).toHaveCount(2);
 await navigate(page,'셀 데이터');await expect(page.getByRole('button',{name:'관제',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('navigation',{name:'작업 선택'}).getByRole('button')).toHaveCount(5);
 await expect(page.locator('.sidebar,.topbar')).toHaveCount(0);await expect(page.getByRole('button',{name:'운영 지표',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'판단 화면으로'}).click();await expect(page.locator('.console-home-body')).toBeVisible();
});
