import {prepareInspection} from './inspection';
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
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
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
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('HELP-DRAFT');await page.getByLabel('조합 검토 사유',{exact:true}).fill('안내 상태 보존 검증');
 await page.getByRole('button',{name:'사용 안내',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByLabel('팩 일련번호')).toHaveValue('HELP-DRAFT');
 await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();await page.getByRole('button',{name:/^(생산|품질|연구) 홈$/}).click();await page.getByRole('button',{name:'검사 확인·기록'}).click();await prepareInspection(page);await page.getByRole('button',{name:'검사 메모·저장으로'}).click();await prepareInspection(page,true);await page.getByRole('textbox',{name:'검사 메모',exact:true}).fill('저장하지 않은 관찰 내용');await page.setViewportSize({width:320,height:480});
 await page.getByRole('button',{name:'사용 안내',exact:true}).click();await expect(page.locator('#manual-title')).toContainText('현장 검사');await page.screenshot({path:'.local/manual-small.png'});await page.getByRole('button',{name:'업무로 돌아가기'}).click();await expect(page.getByRole('textbox',{name:'검사 메모',exact:true})).toHaveValue('저장하지 않은 관찰 내용');await expect(page.getByRole('button',{name:'검사 결과 저장',exact:true})).toBeVisible();
});

test('help stays reachable when the twin header changes with viewport size',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await navigate(page,'공정 관리');
 for(const [width,height] of [[1366,768],[320,480],[1366,768]]){await page.setViewportSize({width,height});await page.getByRole('button',{name:'사용 안내',exact:true}).click();await expect(page.locator('#manual-title')).toContainText('공정 공간');await page.keyboard.press('Escape');}
});

test('every scenario has readable numbered screenshots, outcomes and troubleshooting',async({page})=>{
 await page.goto('/batt/#docs/inspection');const nav=page.getByRole('navigation',{name:'업무 시나리오'});await expect(nav.getByRole('button')).toHaveCount(13);const names=await nav.getByRole('button').allTextContents();expect(names).toHaveLength(13);
 for(const name of names){await nav.getByRole('button',{name,exact:true}).click();const article=page.locator('.manual-reading article');await expect(article.locator('h2')).toHaveText(name);expect(await article.locator('.manual-figure').count()).toBeGreaterThanOrEqual(2);await expect(article.locator('.manual-troubleshooting')).toBeVisible();await expect(article).toContainText('처리 후 확인');
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

test('help targets the selected action, does not highlight the approval toolbar, and follows resizing',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 await page.getByRole('button',{name:'샘플 데이터',exact:true}).click();
 await page.getByRole('button',{name:'사용 안내',exact:true}).click();
 const topics=page.getByRole('navigation',{name:'설명할 항목'});
 await topics.getByRole('button',{name:'업무로 돌아가기',exact:true}).click();
 const target=page.locator('.sample-data-view .console-task-heading > button');
 for(const [width,height] of [[1366,768],[390,844],[320,480]]){
  await page.setViewportSize({width,height});
  await expect.poll(async()=>{const a=await target.boundingBox(),b=await page.locator('.manual-spotlight').boundingBox();return !!a&&!!b&&Math.abs(b.x-Math.max(4,a.x-12))<1&&Math.abs(b.y-Math.max(4,a.y-12))<1&&Math.abs(b.x+b.width-Math.min(width-4,a.x+a.width+12))<1&&Math.abs(b.y+b.height-Math.min(height-4,a.y+a.height+12))<1;}).toBe(true);
 }
 await page.keyboard.press('Escape');await page.setViewportSize({width:1366,height:768});await target.click();await navigate(page,'품질·공정 승인함');await page.getByRole('button',{name:'사용 안내',exact:true}).click();await topics.getByRole('button',{name:'근거 검토 후 판단',exact:true}).click();
 await expect(page.locator('.manual-spotlight')).toHaveCount(0);await expect(page.locator('.manual-current small')).toBeVisible();await page.keyboard.press('Escape');
});

test('inspection highlight includes evidence, kind and judgement, and can reveal the underlying area',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('HELP-BOUNDS');await page.getByLabel('조합 검토 사유',{exact:true}).fill('합성 강조 영역 검사');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();await page.getByRole('button',{name:/^(생산|품질|연구) 홈$/}).click();await page.getByRole('button',{name:'검사 확인·기록'}).click();
 await page.getByRole('button',{name:'사용 안내',exact:true}).click();await page.getByRole('button',{name:'실측·시험 및 판정 구분',exact:true}).click();
 for(const name of ['현장 검사 근거','검사 구분','판정']){
  await expect.poll(async()=>{const a=await page.getByRole('radiogroup',{name,exact:true}).boundingBox(),b=await page.locator('.manual-spotlight').boundingBox();return !!a&&!!b&&b.x<=a.x+1&&b.y<=a.y+1&&b.x+b.width>=a.x+a.width-1&&b.y+b.height>=a.y+a.height-1;}).toBe(true);
 }
 await page.setViewportSize({width:320,height:480});await page.getByRole('button',{name:'강조 영역만 보기',exact:true}).click();await expect(page.locator('.manual-spotlight')).toBeVisible();await expect(page.getByRole('button',{name:'설명 닫기',exact:true})).toBeInViewport({ratio:1});await page.getByRole('button',{name:'설명 다시 펼치기',exact:true}).click();await expect(page.getByRole('button',{name:'실측·시험 및 판정 구분',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('quality help has a padded rounded frame and Docs keeps a separate reading surface',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();await page.getByRole('button',{name:'품질',exact:true}).click();await page.getByRole('button',{name:'사용 안내',exact:true}).click();await page.getByRole('button',{name:'지표의 근거 확인',exact:true}).click();
 const frame=page.locator('.manual-spotlight');await expect(frame).toBeVisible();await expect(frame).toHaveCSS('border-top-width','2px');await expect(frame).toHaveCSS('border-top-left-radius','12px');
 await page.screenshot({path:'.local/manual-quality-comfort.png'});
 await page.getByRole('button',{name:'DOCS 전체 매뉴얼',exact:true}).click();await expect(page.locator('.manual-reading')).toHaveCSS('border-top-width','1px');
 for(const [width,height] of [[1366,768],[390,844],[320,480]]){await page.setViewportSize({width,height});await expect(page.getByRole('button',{name:'DOCS 닫기',exact:true})).toBeInViewport();expect(await page.locator('.manual-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.screenshot({path:`.local/docs-comfort-${width}.png`});}
});
