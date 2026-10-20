import {test,expect} from '@playwright/test';
for(const viewport of [{width:1440,height:900},{width:1366,height:768},{width:1024,height:600},{width:390,height:844},{width:390,height:600},{width:320,height:480}])test(`entry fits and starts at production home ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/batt/');
 await expect(page.getByRole('button',{name:'로그인',exact:true})).toBeInViewport({ratio:1});
 await expect(page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true})).toBeInViewport({ratio:1});
 expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth<=innerWidth,height:document.documentElement.scrollHeight<=innerHeight}))).toEqual({width:true,height:true});
 await page.screenshot({path:`test-results/entry-${viewport.width}x${viewport.height}.png`});
 if(viewport.height>=600){await page.getByRole('button',{name:'사용 권한 신청',exact:true}).click();await expect(page.getByLabel('이름',{exact:true})).toBeInViewport({ratio:1});await expect(page.getByRole('button',{name:'가입 신청',exact:true})).toBeInViewport({ratio:1});expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);}
 await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();
 await expect(page.getByRole('button',{name:'생산 작업',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('button',{name:'셀 검사·재고',exact:true})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'측정 파일 등록 시작',exact:true}).click();
 await expect(page.getByRole('region',{name:'전체 공정 체험 안내'})).toBeVisible();
});
for(const viewport of [{width:1366,height:768},{width:1366,height:600},{width:390,height:844}])test(`research tools share task heading ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();
 await page.getByRole('button',{name:'연구',exact:true}).click();await page.getByRole('button',{name:'공정 설계·시뮬레이션',exact:true}).click();
 const header=page.locator('.console-task-heading');
 await expect(header.getByRole('button',{name:'공정 설계 · 데이터 확보',exact:true})).toBeInViewport({ratio:1});
 await expect(header.getByRole('button',{name:'공정 승인함',exact:true})).toBeInViewport({ratio:1});
 await expect(page.locator('.designer-header')).toHaveCount(0);
 await expect(page.locator('.process-designer > .context-line')).toHaveCount(0);
 if(viewport.width>960)expect(await page.locator('.process-designer').evaluate(e=>e.scrollHeight-e.clientHeight)).toBeLessThanOrEqual(1);
 await header.getByRole('button',{name:'시뮬레이션 · 작업 효율',exact:true}).click();await expect(page.locator('.designer-metrics')).toBeVisible();
 await header.getByRole('button',{name:'공정 설계 · 데이터 확보',exact:true}).click();await page.getByLabel('장비 이름',{exact:true}).fill('복귀 확인 장비');
 await header.getByRole('button',{name:'시뮬레이션 · 작업 효율',exact:true}).click();await header.getByRole('button',{name:'공정 설계 · 데이터 확보',exact:true}).click();await expect(page.getByLabel('장비 이름',{exact:true})).toHaveValue('복귀 확인 장비');
 await page.screenshot({path:`test-results/research-heading-${viewport.width}x${viewport.height}.png`});
});
