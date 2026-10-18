import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test('logout aborts a delayed operational read and destroys prior workspace state',async({page})=>{
 const id='11111111-1111-4111-8111-111111111111';let release!:()=>void;const delayed=new Promise<void>(r=>release=r);let started=false;
 await page.addInitScript(id=>localStorage.setItem('sb-asfrsorbzmqhnwnxlxar-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,email:'first@example.com',aud:'authenticated',role:'authenticated'}})),id);
 const profile={id,role:'operator',status:'approved',display_name:'첫 사용자',process_stages:['assembly']};
 await page.route('https://asfrsorbzmqhnwnxlxar.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/profiles'))return route.fulfill({json:profile});
  if(path.endsWith('/read_workbench')){started=true;await delayed;await route.fulfill({json:{profile,changed:true,revision:1,cells:[],packs:[{id:'old',serial_no:'PREVIOUS-ACCOUNT',pack_cells:[],created_at:''}],tests:[],members:[]}}).catch(()=>{});return;}
  return route.fulfill({json:[]});
 });
 await page.goto('/batt/');await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();await expect.poll(()=>started).toBe(true);
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();release();
 await navigate(page,'셀 데이터');await step(page,'셀 재고');await expect(page.getByRole('row').filter({hasText:'DEMO-0001'})).toBeVisible();await navigate(page,'팩 · 검사이력');await expect(page.getByText('PREVIOUS-ACCOUNT')).toHaveCount(0);
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await expect(page.locator('.operations-console')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('membership revocation clears operational content on the next snapshot',async({page})=>{
 const id='22222222-2222-4222-8222-222222222222';let suspended=false;
 await page.addInitScript(id=>localStorage.setItem('sb-asfrsorbzmqhnwnxlxar-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,email:'test@example.com',aud:'authenticated',role:'authenticated'}})),id);
 await page.route('https://asfrsorbzmqhnwnxlxar.supabase.co/**',route=>{const path=new URL(route.request().url()).pathname;const profile={id,role:'operator',status:suspended?'suspended':'approved',process_stages:['assembly']};if(path.endsWith('/profiles'))return route.fulfill({json:profile});if(path.endsWith('/read_workbench'))return route.fulfill({json:{profile,changed:true,revision:suspended?null:1,cells:[],packs:[],tests:[],members:[]}});return route.fulfill({json:[]});});
 await page.clock.install();await page.goto('/batt/');await expect(page.locator('.operations-console')).toBeVisible();suspended=true;await page.clock.fastForward(16000);await expect(page.getByRole('heading',{name:'이용 중지',exact:true})).toBeVisible();await expect(page.locator('.operations-console')).toHaveCount(0);
});
