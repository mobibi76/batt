import {test,expect} from '@playwright/test';
for(const width of [1440,1024,390])test(`title product image and access controls at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/batt/');
 const art=page.locator('.cell-pack-art');await art.evaluate((el:HTMLImageElement)=>el.decode());
 expect(await art.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(500);
 if(width>800){await expect(art).toBeVisible();await expect(art).toBeInViewport();}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('button',{name:'로그인',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'사용 권한 신청',exact:true}).click();await expect(page.getByLabel('이름',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();await expect(page.getByRole('button',{name:'예시 셀로 다음 단계',exact:true})).toBeVisible();
});
