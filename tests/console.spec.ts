import {prepareInspection} from './inspection';
import {choose} from './chips';
import {navigate,step} from './workspace';
import {test,expect} from '@playwright/test';
for(const [width,height] of [[1366,768],[1024,600],[768,1024],[1920,1080],[320,480]])test(`production quality and research retain navigation at ${width}x${height}`,async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();

  await page.setViewportSize({width,height});
  for(const mode of ['생산','품질','연구']){await page.getByRole('button',{name:mode,exact:true}).click();for(const label of await page.getByRole('navigation',{name:'작업 선택'}).getByRole('button').allTextContents()){
   await page.getByRole('navigation',{name:'작업 선택'}).getByRole('button',{name:label,exact:true}).click();expect(await page.evaluate(()=>({x:document.documentElement.scrollWidth<=innerWidth,y:document.documentElement.scrollHeight<=innerHeight}))).toEqual({x:true,y:true});
   expect(await page.locator('.console-content').evaluate(e=>e.scrollHeight<=e.clientHeight+1),`${width}x${height} ${mode}/${label}`).toBe(true);
   for(const status of await page.locator('.console-pager > span:visible').all())expect(await status.evaluate(e=>getComputedStyle(e).whiteSpace)).toBe('nowrap');
  }}
 await page.getByRole('button',{name:'생산',exact:true}).click();await expect(page.getByRole('button',{name:'품질 현황',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'가상 실행',exact:true})).toHaveCount(0);
});
test('field confirmation uses existing pack data and does not perform quality approval',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('FIELD-001');await page.getByLabel('조합 검토 사유',{exact:true}).fill('합성 시험 조합 검토');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();
 await page.getByRole('button',{name:/^(생산|품질|연구) 홈$/}).click();await page.getByRole('button',{name:'생산 작업',exact:true}).click();await expect(page.locator('.console-target')).toContainText('FIELD-001');
 await page.getByRole('button',{name:'검사 확인·기록'}).click();await choose(page,'판정','fail');await prepareInspection(page);await page.getByRole('button',{name:'검사 메모·저장으로'}).click();await prepareInspection(page,true);await page.getByLabel('검사 메모',{exact:true}).fill('검사 조건 확인');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await expect(page.locator('.console-target')).toContainText('모듈 검사 불합격');
 await page.getByRole('navigation',{name:'작업 선택'}).getByRole('button',{name:'팩 진행 이력',exact:true}).click();await page.getByRole('button',{name:/^(생산|품질|연구) 홈$/}).click();await expect(page.locator('.console-target')).toContainText('FIELD-001');
 await page.getByRole('button',{name:'품질',exact:true}).click();await page.getByRole('button',{name:'품질 현황',exact:true}).click();await expect(page.locator('.console-target')).toContainText('FIELD-001');await expect(page.locator('.console-target')).toContainText('모듈 검사 불합격');
});

test('next work selects the unresolved inspection then hands the same pack to quality review',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await expect(page.getByRole('button',{name:'생산 작업',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'셀 매칭 시작',exact:true}).click();await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('NEXT-WORK');await page.getByLabel('조합 검토 사유',{exact:true}).fill('업무 연결 검증');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();
 await page.getByRole('button',{name:/^(생산|품질|연구) 홈$/}).click();await expect(page.locator('.console-target')).toContainText('NEXT-WORK');await expect(page.getByRole('button',{name:'첫 대상 확인'})).toHaveCount(0);
 for(const kind of ['module','casing','final']){
  await page.setViewportSize({width:320,height:480});
  await page.getByRole('button',{name:'검사 확인·기록',exact:true}).click();await expect(page.getByRole('radiogroup',{name:'검사 구분'}).locator(`input[value="${kind}"]`)).toBeChecked();
  await expect(page.getByRole('button',{name:'검사 메모·저장으로'})).toBeInViewport({ratio:1});await expect(page.getByRole('button',{name:'검사 입력 닫기'})).toBeInViewport({ratio:1});
  expect(await page.locator('.console-content').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
  await prepareInspection(page);await page.getByRole('button',{name:'검사 메모·저장으로'}).click();await expect(page.getByRole('button',{name:'검사 결과 저장',exact:true})).toBeInViewport({ratio:1});await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.setViewportSize({width:1366,height:768});
 }
 await expect(page.getByRole('button',{name:'검사 확인·기록',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'품질 검토 요청',exact:true}).click();await expect(page.getByRole('radiogroup',{name:'품질 검토 대상 팩'}).getByRole('radio',{name:'NEXT-WORK'})).toBeChecked();
 await navigate(page,'운영 현황');await page.getByRole('button',{name:/검사 연결률/}).click();await expect(page.getByRole('radiogroup',{name:'조회 조건 · 품질 기록 관리'}).locator('input[value="unlinked"]')).toBeChecked();await expect(page.getByText('현재 조건에 해당하는 팩이 없습니다.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'전체 팩 보기',exact:true}).click();await expect(page.getByRole('row').filter({hasText:'NEXT-WORK'})).toBeVisible();
});
