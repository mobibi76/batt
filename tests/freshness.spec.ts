import {test,expect} from '@playwright/test';
test('registered records refresh automatically and failed refresh is visibly stale',async({page})=>{
 const id='11111111-1111-4111-8111-111111111111';let fail=false,reads=0;
 await page.addInitScript(({id})=>localStorage.setItem('sb-asfrsorbzmqhnwnxlxar-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,email:'test@example.com',aud:'authenticated',role:'authenticated'}})),{id});
 await page.route('https://asfrsorbzmqhnwnxlxar.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/profiles'))return route.fulfill({json:{id,email:'test@example.com',display_name:'현장 담당자',role:'operator',status:'approved',process_stages:['final'],created_at:''}});
  if(path.endsWith('/packs')){reads++;if(fail)return route.fulfill({status:400,json:{message:'test outage'}});return route.fulfill({json:reads>1?[{id:'pack-1',serial_no:'AUTO-UPDATED',created_at:new Date().toISOString(),pack_cells:[]}]:[]});}
  return route.fulfill({json:[]});
 });
 await page.clock.install();await page.goto('/batt/');await page.getByRole('button',{name:'상세 업무 열기'}).click();await expect(page.locator('.data-freshness')).toContainText('마지막 조회');
 await expect(page.getByRole('navigation').getByRole('button',{name:'사용자 관리'})).toHaveCount(0);
 await page.clock.fastForward(16000);
 await expect(page.locator('.outcome-basis').nth(1)).toContainText('전체 1팩');
 fail=true;await page.clock.fastForward(16000);
 await expect(page.locator('.data-freshness')).toContainText('갱신 실패 · 이전 조회본');
 await expect(page.locator('.outcome-basis').nth(1)).toContainText('전체 1팩');
 fail=false;await page.clock.fastForward(16000);await expect(page.locator('.data-freshness')).toContainText('마지막 조회');
});
