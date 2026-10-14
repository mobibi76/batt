import {test,expect} from '@playwright/test';
test('tools stay inside field or control modes with contextual navigation',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 await expect(page.getByRole('button',{name:'상세 업무 열기'})).toHaveCount(0);
 await page.locator('.console-footer').getByRole('button',{name:'셀 매칭',exact:true}).click();
 await expect(page.locator('.topbar').getByRole('button',{name:'현장',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('navigation',{name:'주요 업무'}).getByRole('button')).toHaveCount(3);
 await expect(page.locator('.sidebar').getByRole('button',{name:'품질·공정 승인함'})).toHaveCount(0);
 await page.getByRole('navigation',{name:'업무 단계'}).getByRole('button',{name:'셀 데이터',exact:true}).click();
 await expect(page.locator('.topbar').getByRole('button',{name:'관제',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('navigation',{name:'주요 업무'}).getByRole('button')).toHaveCount(6);
 await page.getByRole('button',{name:'관제 공정으로',exact:true}).click();await expect(page.locator('.operations-console')).toBeVisible();
 await expect(page.getByRole('button',{name:'데이터 인입',exact:true})).toBeVisible();
});
