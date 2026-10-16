import {readFile} from 'node:fs/promises';
import {prepareInspection} from './inspection';
import {choose} from './chips';
import {navigate,step} from './workspace';
import {test,expect} from '@playwright/test';
test('file-first demo validates measurements and follows the same cells through final approval',async({page})=>{
 // Two file imports, inventory review and the full inspection/approval chain run together.
 test.setTimeout(90000);
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 전체 공정 체험',exact:true}).click();
 await expect(page.getByRole('region',{name:'전체 공정 체험 안내'})).toContainText('1. 충방전 측정 파일 등록');
 await step(page,'셀 재고');await expect(page.getByRole('heading',{name:'셀 재고 0',exact:true})).toBeVisible();await step(page,'측정 파일로 시작하세요');
 for(const invalid of [true,false]){
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:invalid?'용량 누락 오류 파일 받기':'가상 측정 파일 받기',exact:true}).click();const file=await downloading;
  const opening=page.waitForEvent('filechooser');await page.getByRole('button',{name:'파일 가져오기',exact:true}).click();await (await opening).setFiles({name:file.suggestedFilename(),mimeType:'text/csv',buffer:await readFile((await file.path())!)});
  const dialog=page.getByRole('dialog',{name:'파일 등록 미리보기'});
  if(invalid){await expect(dialog).toContainText('오류를 수정하세요');await expect(dialog.getByRole('button',{name:/전체 .*개 등록/})).toBeDisabled();await dialog.getByRole('button',{name:'취소',exact:true}).click();}
  else {await expect(dialog).toContainText('형식 검증 완료');await expect(dialog.getByRole('radio',{name:'실측 자료',exact:true})).toBeDisabled();await dialog.getByRole('button',{name:'전체 128개 등록',exact:true}).click();}
 }
 await page.getByRole('button',{name:'용량별 재고 확인',exact:true}).click();await expect(page.getByRole('heading',{name:'셀 재고 128',exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:'DEMO-0001 합성값',exact:true})).toBeVisible();
 await page.screenshot({path:'.local/demo-file-inventory.png'});
 await page.getByRole('row').filter({hasText:'DEMO-0001'}).getByRole('button',{name:'측정 검토',exact:true}).click();
 await page.getByRole('button',{name:'측정 검토',exact:true}).first().click();await page.getByLabel('처리 사유',{exact:true}).fill('가상 셀 보류 시연');await page.getByRole('button',{name:'셀 보류',exact:true}).click();
 await page.getByRole('button',{name:'용량별 재고 확인',exact:true}).click();await expect(page.getByRole('row').filter({hasText:'DEMO-0001'})).toContainText('보류');


 await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await expect(page.getByRole('dialog').locator('.id-list')).not.toContainText('DEMO-0001');await page.getByLabel('팩 일련번호').fill('CONNECTED-QUALITY');await page.getByLabel('조합 검토 사유',{exact:true}).fill('합성 시험 조합 검토');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();
 await page.getByRole('button',{name:'이 팩 검사로 이어가기'}).click();await expect(page.getByRole('dialog')).toHaveAttribute('aria-label','CONNECTED-QUALITY');
 await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await choose(page,'검사 구분','casing');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await choose(page,'검사 구분','final');await choose(page,'판정','fail');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'생산',exact:true}).click();await page.getByRole('button',{name:'생산 작업',exact:true}).click();await expect(page.locator('.console-target')).toContainText('CONNECTED-QUALITY');await expect(page.locator('.console-target')).toContainText('최종검사 불합격');
 await navigate(page,'팩 · 검사이력');await page.getByRole('button',{name:'상세 조회',exact:true}).click();await choose(page,'검사 구분','final');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.getByRole('button',{name:'이 팩 품질 검토 요청',exact:true}).click();
 await expect(page.getByRole('radiogroup',{name:'품질 검토 대상 팩',exact:true}).getByRole('radio',{name:'CONNECTED-QUALITY',exact:true})).toBeChecked();
 await page.getByLabel('검토 요청 사유',{exact:true}).fill('재검사 근거 확인 후 최종 승인 요청');await page.getByRole('button',{name:'팩 품질 검토 요청'}).click();await choose(page,'체험 역할','demo-reviewer');await page.getByLabel('검토 의견').fill('공정 확인 및 재검사 결과 확인');await page.getByRole('button',{name:'제출본 승인',exact:true}).click();await page.getByRole('button',{name:'품질 결과 확인',exact:true}).click();
 await expect(page.locator('.outcome-comparison article').nth(0)).toContainText('100%');await expect(page.locator('.outcome-comparison article').nth(1)).toContainText('0%');
 await navigate(page,'팩 · 검사이력');await expect(page.getByRole('row').filter({hasText:'CONNECTED-QUALITY'})).toContainText('품질 승인 완료');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:720});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('file-first entry remains usable on a small screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 전체 공정 체험',exact:true}).click();
 await expect(page.getByRole('button',{name:'가상 측정 파일 받기',exact:true})).toBeInViewport();
 await page.getByRole('button',{name:'파일 가져오기',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'파일 가져오기',exact:true})).toBeInViewport();
 await page.screenshot({path:'.local/demo-file-start-mobile.png'});
});
