import {test,expect} from '@playwright/test';
test('stalled membership lookup exits the loading screen with a retry path',async({page})=>{
 const id='22222222-2222-4222-8222-222222222222';let release!:()=>void;const delayed=new Promise<void>(r=>release=r);let started=false;
 await page.addInitScript(id=>localStorage.setItem('sb-asfrsorbzmqhnwnxlxar-auth-token',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated'}})),id);
 await page.route('https://asfrsorbzmqhnwnxlxar.supabase.co/**',async route=>{if(new URL(route.request().url()).pathname.endsWith('/profiles')){started=true;await delayed;await route.fulfill({json:{id}}).catch(()=>{});return;}return route.fulfill({json:[]});});
 try{await page.clock.install();await page.goto('/batt/');await expect.poll(()=>started).toBe(true);await page.clock.fastForward(11000);await expect(page.getByRole('heading',{name:'계정 확인 필요',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'승인 상태 새로고침',exact:true})).toBeVisible();}finally{release();}
});
for(const fault of ['missing-packs','old-revision','timeout'])test(`operational snapshot survives ${fault} and recovers`,async({page})=>{
 const id='11111111-1111-4111-8111-111111111111';let mode='normal',reads=0;let release!:()=>void;const delayed=new Promise<void>(r=>release=r);
 const profile={id,email:'fixture@example.invalid',display_name:'시험 사용자',role:'operator',status:'approved',process_stages:['final']};
 const snapshot={profile,changed:true,revision:10,cells:[],packs:[{id:'fixture-pack',serial_no:'RETAINED',created_at:'2026-10-15T00:00:00Z',pack_cells:[],source_kind:'measured'}],tests:[],members:[]};
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(id=>localStorage.setItem('sb-asfrsorbzmqhnwnxlxar-auth-token',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated'}})),id);
 await page.route('https://asfrsorbzmqhnwnxlxar.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/profiles'))return route.fulfill({json:profile});
  if(path.endsWith('/read_workbench')){reads++;const thisMode=mode;
   if(thisMode==='timeout'){await delayed;await route.fulfill({json:snapshot}).catch(()=>{});return;}
   if(thisMode==='missing-packs')return route.fulfill({json:{...snapshot,packs:null}});
   if(thisMode==='old-revision')return route.fulfill({json:{...snapshot,revision:9,packs:[]}});
   return route.fulfill({json:snapshot});
  }
  return route.fulfill({json:[]});
 });
 try{
  await page.clock.install();await page.goto('/batt/');await page.getByRole('button',{name:'관제',exact:true}).click();await page.getByRole('button',{name:'데이터 인입',exact:true}).click();await expect(page.locator('.console-focus')).toContainText('0/1팩');
  mode=fault;await page.clock.fastForward(16000);await expect.poll(()=>reads).toBe(2);if(fault==='timeout')await page.clock.fastForward(11000);
  await expect(page.locator('.console-source')).toContainText('갱신 실패');await expect(page.locator('.console-focus')).toContainText('0/1팩');expect(errors).toEqual([]);
  mode='normal';await page.clock.fastForward(16000);await expect.poll(()=>reads).toBeGreaterThan(2);await expect(page.locator('.console-source')).not.toContainText('갱신 실패');await expect(page.locator('.console-focus')).toContainText('0/1팩');
 }finally{release();}
});
