import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test('all import controls open a file chooser by mouse and keyboard',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 for(const [task,panel,name] of [['셀 데이터','고객 자료 검토','고객 측정 파일 가져오기'],['셀 데이터','측정 파일로 시작하세요','파일 가져오기'],['공정 관리','저장·가져오기','공정 JSON 가져오기'],['알고리즘 검증','1. 연구 데이터','검증 CSV 가져오기']]){
  await navigate(page,task);if(task==='알고리즘 검증')await page.getByText('추가 연구 CSV 가져오기',{exact:true}).click();else await step(page,panel);
  const button=page.getByRole('button',{name,exact:true});await expect(button).toBeEnabled();
  for(const method of ['mouse','Enter','Space']){const opened=page.waitForEvent('filechooser');if(method==='mouse')await button.click();else{await button.focus();await page.keyboard.press(method);}const picker=await opened;await picker.setFiles([]);}
 }
});
test('customer import reads the selected file and can select the same file again',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'셀 데이터');await step(page,'고객 자료 검토');
 for(let i=0;i<2;i++){const opened=page.waitForEvent('filechooser');await page.getByRole('button',{name:'고객 측정 파일 가져오기'}).click();await (await opened).setFiles('tests/fixtures/sample.xlsx');await expect(page.locator('.evidence-workspace')).toContainText('sample.xlsx · 1행');await expect(page.getByRole('button',{name:'원자료 배치 등록'})).toBeEnabled();}
});
test('users without cell registration permission see the reason instead of an active-looking import',async({page})=>{
 const id='11111111-1111-4111-8111-111111111111';const profile={id,email:'test@example.com',display_name:'최종검사 담당자',role:'operator',status:'approved',process_stages:['final'],created_at:''};
 await page.addInitScript(({id})=>localStorage.setItem('sb-asfrsorbzmqhnwnxlxar-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,email:'test@example.com',aud:'authenticated',role:'authenticated'}})),{id});
 await page.route('https://asfrsorbzmqhnwnxlxar.supabase.co/**',route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/profiles'))return route.fulfill({json:profile});if(path.endsWith('/read_workbench'))return route.fulfill({json:{profile,changed:true,revision:1,cells:[],packs:[],tests:[],members:[]}});return route.fulfill({json:[]});});
 await page.goto('/batt/');await expect(page.getByRole('button',{name:'품질',exact:true})).toBeVisible();await navigate(page,'셀 데이터');await step(page,'고객 자료 검토');const button=page.getByRole('button',{name:'고객 측정 파일 가져오기'});await expect(button).toBeDisabled();await expect(button).toHaveAccessibleDescription('셀 등록·매칭 담당 권한이 필요합니다. 관리자에게 담당 배정을 요청하세요.');await expect(page.locator('.file-picker-hint')).toBeVisible();await page.screenshot({path:'.local/file-picker-permission.png'});
});
