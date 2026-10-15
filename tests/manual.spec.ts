import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test('requested help preserves login input and DOCS shares scenarios, search and print',async({page})=>{
 await page.goto('/batt/');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByLabel('이메일',{exact:true}).fill('draft@example.com');await page.getByRole('button',{name:'사용 안내',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('화면 설명');await expect(page.locator('.manual-spotlight')).toBeVisible();
 await page.getByRole('button',{name:'DOCS 전체 매뉴얼'}).click();await expect(page.getByRole('navigation',{name:'업무 시나리오'}).getByRole('button')).toHaveCount(13);
 await page.getByRole('searchbox').fill('권한');await expect(page.getByRole('navigation',{name:'업무 시나리오'}).getByRole('button').first()).toBeVisible();
 await page.emulateMedia({media:'print'});await expect(page.locator('.manual-print .manual-article')).toHaveCount(13);await expect(page.locator('.manual-print')).toBeVisible();await expect(page.locator('#root')).toBeHidden();await page.emulateMedia({media:'screen'});
 await page.getByRole('button',{name:'DOCS 닫기'}).click();await expect(page.getByLabel('이메일',{exact:true})).toHaveValue('draft@example.com');await expect(page.getByRole('button',{name:'사용 안내',exact:true})).toBeFocused();
});
test('help and docs fit small and large displays and return to the same work',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 for(const [width,height] of [[1366,768],[390,844],[320,480]]){
  await page.setViewportSize({width,height});await page.getByRole('button',{name:'사용 안내',exact:true}).click();
  await expect(page.getByRole('button',{name:'설명 닫기'})).toBeInViewport({ratio:1});await expect(page.getByRole('button',{name:'업무로 돌아가기'})).toBeInViewport({ratio:1});
  await page.getByRole('button',{name:'DOCS 전체 매뉴얼'}).click();await expect(page.getByRole('button',{name:'DOCS 닫기'})).toBeInViewport({ratio:1});
  expect(await page.locator('.manual-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 }
 await page.setViewportSize({width:1366,height:768});await navigate(page,'셀 데이터');await page.getByRole('button',{name:'사용 안내',exact:true}).click();await expect(page.locator('#manual-title')).toContainText('데이터');await page.keyboard.press('Escape');await expect(page.locator('.console-task-heading')).toContainText('셀 데이터');
 await page.screenshot({path:'.local/manual-work.png'});
 await page.getByRole('button',{name:'사용 안내',exact:true}).click();await page.screenshot({path:'.local/manual-help.png'});await page.getByRole('button',{name:'DOCS 전체 매뉴얼'}).click();await page.screenshot({path:'.local/manual-docs.png'});
});
test('manual links open without production data access',async({page})=>{await page.goto('/batt/#docs/research');await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.manual-reading')).toContainText('Severson');await page.getByRole('button',{name:'DOCS 닫기'}).click();await expect(page.getByLabel('이메일',{exact:true})).toBeVisible();});

test('inspection guidance preserves an unsaved memo and does not submit it',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('HELP-DRAFT');await page.getByLabel('조합 검토 사유',{exact:true}).fill('안내 상태 보존 검증');
 await page.getByRole('button',{name:'사용 안내',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByLabel('팩 일련번호')).toHaveValue('HELP-DRAFT');
 await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();await page.getByRole('button',{name:'판단 화면으로'}).click();await page.getByRole('button',{name:'검사 확인·기록'}).click();await page.getByRole('button',{name:'검사 메모·저장으로'}).click();await page.getByRole('textbox',{name:'검사 메모',exact:true}).fill('저장하지 않은 관찰 내용');await page.setViewportSize({width:320,height:480});
 await page.getByRole('button',{name:'사용 안내',exact:true}).click();await expect(page.locator('#manual-title')).toContainText('현장 검사');await page.screenshot({path:'.local/manual-small.png'});await page.getByRole('button',{name:'업무로 돌아가기'}).click();await expect(page.getByRole('textbox',{name:'검사 메모',exact:true})).toHaveValue('저장하지 않은 관찰 내용');await expect(page.getByRole('button',{name:'검사 결과 저장',exact:true})).toBeVisible();
});

test('help stays reachable when the twin header changes with viewport size',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'공정 관리');
 for(const [width,height] of [[1366,768],[320,480],[1366,768]]){await page.setViewportSize({width,height});await page.getByRole('button',{name:'사용 안내',exact:true}).click();await expect(page.locator('#manual-title')).toContainText('공정 공간');await page.keyboard.press('Escape');}
});

test('every scenario has readable numbered screenshots, outcomes and troubleshooting',async({page})=>{
 await page.goto('/batt/#docs/inspection');const nav=page.getByRole('navigation',{name:'업무 시나리오'});const names=await nav.getByRole('button').allTextContents();expect(names).toHaveLength(13);
 for(const name of names){await nav.getByRole('button',{name,exact:true}).click();const article=page.locator('.manual-reading article');expect(await article.locator('.manual-figure').count()).toBeGreaterThanOrEqual(2);await expect(article.locator('.manual-troubleshooting')).toBeVisible();await expect(article).toContainText('처리 후 확인');
  const images=article.locator('img');await images.evaluateAll(async nodes=>{await Promise.all(nodes.map(async node=>{const img=node as HTMLImageElement;img.loading='eager';await img.decode();if(img.naturalWidth!==1366)throw Error('Broken manual capture');}));});
  expect(await article.locator('.manual-callouts li').count()).toBeGreaterThanOrEqual(2);
 }
 await nav.getByRole('button',{name:'현장 검사·재검사 기록',exact:true}).click();await expect(page.locator('.manual-reading .manual-figure')).toHaveCount(5);
 for(const [width,height] of [[1366,900],[390,844],[320,480]]){await page.setViewportSize({width,height});expect(await page.locator('.manual-reading').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);await expect(page.getByRole('button',{name:'DOCS 닫기'})).toBeInViewport({ratio:1});await page.screenshot({path:`.local/manual-illustrated-${width}.png`});}
 await page.setViewportSize({width:1366,height:900});const popupPromise=page.waitForEvent('popup');await page.locator('.manual-reading .manual-figure a').first().click();const popup=await popupPromise;await popup.waitForLoadState();expect(popup.url()).toContain('/manual/screens/inspection-select.jpg');await popup.close();await expect(page.getByRole('dialog')).toBeVisible();
 await page.locator('.manual-reading').getByRole('button',{name:/3\. 검사 메모/}).click();await expect(page.locator('.manual-reading [data-manual-step="2"] h3')).toBeInViewport();
 await page.screenshot({path:'.local/manual-illustrated-detail.png'});
});

test('printing waits for screenshots and includes all scenario evidence',async({page})=>{
 await page.goto('/batt/#docs/inspection');await page.evaluate(()=>{(window as any).manualPrintCalled=false;window.print=()=>{(window as any).manualPrintCalled=[...document.querySelectorAll<HTMLImageElement>('.manual-print img')].every(i=>i.complete&&i.naturalWidth>0);};});
 await page.getByRole('button',{name:'인쇄·PDF 저장'}).click();await expect.poll(()=>page.evaluate(()=>(window as any).manualPrintCalled)).toBe(true);expect(await page.locator('.manual-print img').count()).toBeGreaterThanOrEqual(40);await page.emulateMedia({media:'print'});await expect(page.locator('.manual-print')).toBeVisible();await expect(page.locator('#root')).toBeHidden();
});

test('failed screenshot download prevents an incomplete print without losing the manual',async({page})=>{
 await page.route('**/manual/screens/inspection-select.jpg',r=>r.abort());await page.goto('/batt/#docs/inspection');await page.evaluate(()=>{(window as any).manualPrintCalled=false;window.print=()=>{(window as any).manualPrintCalled=true;};});await page.getByRole('button',{name:'인쇄·PDF 저장'}).click();await expect(page.getByRole('alert')).toContainText('일부 화면 이미지');expect(await page.evaluate(()=>(window as any).manualPrintCalled)).toBe(false);await expect(page.locator('.manual-reading')).toContainText('검사 메모 작성');
});

test('closing DOCS cancels pending print preparation instead of printing the work screen',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 await page.route('**/manual/screens/inspection-select.jpg',async r=>{await gate;await r.continue();});await page.goto('/batt/#docs/inspection',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{(window as any).manualPrintCalled=false;window.print=()=>{(window as any).manualPrintCalled=true;};});
 await page.getByRole('button',{name:'인쇄·PDF 저장'}).click();await expect(page.getByRole('button',{name:'이미지 준비 중'})).toBeDisabled();await page.getByRole('button',{name:'DOCS 닫기'}).click();release();await page.waitForLoadState('networkidle');expect(await page.evaluate(()=>(window as any).manualPrintCalled)).toBe(false);await expect(page.getByLabel('이메일',{exact:true})).toBeVisible();
});
