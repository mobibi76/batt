import {test,expect} from '@playwright/test';
import {navigate,step,researchSide} from './workspace';
import {choose} from './chips';
for(const width of [1366,390]){test.describe(`업무 재개 ${width}px`,()=>{
 test.use({viewport:{width,height:900}});
 test.beforeEach(async({page})=>{await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();});
 test('production search starts at the first matching cell after paging',async({page})=>{
  await page.getByRole('button',{name:'예시 셀로 다음 단계',exact:true}).click();
  const firstCell=await page.locator('.cell-inventory tbody tr').first().innerText();
  await page.getByRole('button',{name:'다음 셀',exact:true}).click();
  await expect(page.locator('.console-pager > span:visible')).toHaveText('2 / 22');
  await page.getByPlaceholder('셀 ID 또는 LOT 검색').fill('DEMO-00');
  await expect(page.locator('.cell-inventory tbody tr').first()).toHaveText(firstCell,{useInnerText:true});
  await page.getByRole('button',{name:'다음 셀',exact:true}).click();
  await page.getByPlaceholder('셀 ID 또는 LOT 검색').fill('없는 셀');
  await expect(page.getByText('표시할 셀 데이터가 없습니다',{exact:true})).toBeVisible();
  await page.getByPlaceholder('셀 ID 또는 LOT 검색').fill('');
  await expect(page.locator('.cell-inventory tbody tr').first()).toHaveText(firstCell,{useInnerText:true});
 });
 test('research repeated run and reopening the same history show results',async({page})=>{
  await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await navigate(page,'알고리즘 검증');await researchSide(page,'controls');await page.getByRole('button',{name:'현재 측정·판정 자료 가져오기'}).click();
  await expect(page.locator('.task-step-panel:visible .field-data-summary')).toContainText('원자료 128행');
  for(let i=0;i<2;i++){await step(page,'2. 비교 조건');await researchSide(page,'controls');await page.getByRole('button',{name:'알고리즘 비교 실행'}).click();await expect(page.getByRole('heading',{name:'3. 검증 결과'})).toBeVisible();}
  for(let i=0;i<2;i++){await step(page,'최근 실험');await page.locator('.research-history button').first().click();await expect(page.getByRole('heading',{name:'3. 검증 결과'})).toBeVisible();}
 });
 test('quality review draft survives list return and stays separate by reviewer',async({page})=>{
  await navigate(page,'공정 관리');await page.getByRole('button',{name:'공정 설계 · 데이터 확보',exact:true}).click();await step(page,'공정 검토 요청');
  await page.getByLabel('공정 버전 이름').fill('다른 배치');await page.getByLabel('변경 이유와 검토 사항').fill('별도 요청');await page.getByRole('button',{name:'공정 승인 요청',exact:true}).click();await expect(page.locator('.process-designer [role=status]')).toContainText('검토 요청을 제출');
  await step(page,'선택 장비 · 데이터 정의');await page.getByLabel('장비 이름',{exact:true}).fill('별도 검토 리더');await step(page,'공정 검토 요청');
  await page.getByLabel('공정 버전 이름').fill('검토 중인 배치');await page.getByLabel('변경 이유와 검토 사항').fill('배치 확인');await page.getByRole('button',{name:'공정 승인 요청',exact:true}).click();
  await expect(page.locator('.process-designer [role=status]')).toContainText('검토 요청을 제출');
  await page.getByRole('button',{name:'공정 승인함',exact:true}).click();
  if(await page.getByRole('button',{name:'제출본 검토',exact:true}).first().isVisible())await page.getByRole('button',{name:'제출본 검토',exact:true}).first().click();
  await expect(page.locator('.approval-detail h2')).toHaveText('검토 중인 배치');
  await choose(page,'체험 역할','demo-reviewer');if(width<=960)await page.getByRole('button',{name:'근거 확인 후 최종 판단',exact:true}).click();
  await page.getByLabel('검토 의견').fill('연결 순서 확인 완료, 태그 추가 확인 중');
  await page.getByRole('button',{name:'승인 목록으로',exact:true}).click();await page.getByRole('row').filter({hasText:'다른 배치'}).getByRole('button',{name:'제출본 검토',exact:true}).click();
  if(width<=960)await page.getByRole('button',{name:'근거 확인 후 최종 판단',exact:true}).click();
  await expect(page.getByLabel('검토 의견')).toHaveValue('');
  await page.getByRole('button',{name:'승인 목록으로',exact:true}).click();await page.getByRole('row').filter({hasText:'검토 중인 배치'}).getByRole('button',{name:'제출본 검토',exact:true}).click();
  if(width<=960)await page.getByRole('button',{name:'근거 확인 후 최종 판단',exact:true}).click();
  await expect(page.getByLabel('검토 의견')).toHaveValue('연결 순서 확인 완료, 태그 추가 확인 중');
  await page.screenshot({path:`test-results/continuity-quality-${width}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await choose(page,'체험 역할','demo-admin');await expect(page.getByLabel('검토 의견')).toHaveCount(0);
  await choose(page,'체험 역할','demo-reviewer');await expect(page.getByLabel('검토 의견')).toHaveValue('연결 순서 확인 완료, 태그 추가 확인 중');
 });
});}
