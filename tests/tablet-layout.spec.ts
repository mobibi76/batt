import {test,expect,type Page} from '@playwright/test';
import {navigate,step} from './workspace';
import {prepareInspection} from './inspection';

const sizes=[
 {width:768,height:1024},{width:1024,height:768},
 {width:800,height:1280},{width:1280,height:800},
 {width:834,height:1194},{width:1194,height:834},
];
test.use({hasTouch:true});
async function enter(page:Page){
 await page.goto('/batt/');
 await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();
 await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();
 await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();
}
async function geometry(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const small=await page.locator('.operations-console button:visible, .manual-dialog button:visible').evaluateAll(es=>es.filter(e=>{
  const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight&&r.height<43;
 }).map(e=>`${e.textContent?.trim()||e.getAttribute('aria-label')}: ${e.getBoundingClientRect().height}`));
 expect(small).toEqual([]);
}
for(const viewport of sizes)test(`tablet workspaces ${viewport.width}x${viewport.height}`,async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize(viewport);await page.goto('/batt/');
 await expect(page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true})).toBeInViewport();
 await enter(page);
 for(const task of ['운영 현황','셀 데이터','셀 매칭','팩 · 검사이력','품질 리포트','알고리즘 검증','공정 관리','품질·공정 승인함','사용자 관리']){
  await navigate(page,task);await geometry(page);
  await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeInViewport();
  await page.screenshot({path:`test-results/tablet-${viewport.width}-${task}.png`});
 }
 await page.getByRole('button',{name:'사용 안내',exact:true}).click();
 await expect(page.getByRole('button',{name:'업무로 돌아가기',exact:true})).toBeInViewport();
 await page.getByRole('button',{name:'DOCS 전체 매뉴얼'}).click();
 await geometry(page);await expect(page.getByRole('button',{name:'DOCS 닫기'})).toBeInViewport();
 expect(await page.locator('.manual-reading').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await expect.poll(()=>page.locator('.manual-reading img').first().evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
 await page.screenshot({path:`test-results/tablet-${viewport.width}-docs.png`});
 await page.getByRole('button',{name:'DOCS 닫기'}).click();
});

test('tablet rotation and keyboard keep pack selection and unsaved inspection input',async({page})=>{
 await page.setViewportSize(sizes[1]);await enter(page);await navigate(page,'셀 매칭');
 await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');
 await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();
 await page.getByLabel('팩 일련번호').fill('TABLET-ROTATE');
 await page.getByRole('textbox',{name:'조합 검토 사유',exact:true}).fill('회전 중 작성한 조합 검토 사유');
 await page.setViewportSize(sizes[0]);
 await expect(page.getByLabel('팩 일련번호')).toHaveValue('TABLET-ROTATE');
 await expect(page.getByRole('textbox',{name:'조합 검토 사유',exact:true})).toHaveValue('회전 중 작성한 조합 검토 사유');
 await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();
 await page.getByRole('button',{name:'이 팩 검사로 이어가기'}).click();await prepareInspection(page,true);
 const memo=page.getByRole('textbox',{name:'검사 메모',exact:true});
 await memo.fill('가로·세로 회전 후에도 유지할 시험 검사 메모');
 for(const viewport of [sizes[1],{width:1024,height:500},sizes[0]]){
  await page.setViewportSize(viewport);
  await expect(memo).toHaveValue('가로·세로 회전 후에도 유지할 시험 검사 메모');
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-label','TABLET-ROTATE');
  const save=page.getByRole('button',{name:'검사 결과 저장',exact:true});
  await save.scrollIntoViewIfNeeded();await expect(save).toBeInViewport({ratio:1});
  await save.click({trial:true});
 }
 await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
});
