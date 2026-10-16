import {readFile} from 'node:fs/promises';
import {prepareInspection} from './inspection';
import {choose} from './chips';
import {navigate,step} from './workspace';
import {test,expect} from '@playwright/test';

for(const width of [1366,390]){test.describe(`역할별 사용자 동선 ${width}px`,()=>{test.use({viewport:{width,height:900}});
test('production operator and quality reviewer complete the same pack',async({page})=>{
 // Two file imports, inventory review and the full inspection/approval chain run together.
 test.setTimeout(90000);
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();
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
 await expect(page.locator('.cell-inventory tbody tr')).toHaveCount(6);expect(await page.locator('.cell-inventory').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.screenshot({path:`test-results/role-production-${width}.png`});
 await page.getByRole('row').filter({hasText:'DEMO-0001'}).getByRole('button',{name:'측정 검토',exact:true}).click();
 await page.getByRole('button',{name:'측정 검토',exact:true}).first().click();await page.getByLabel('처리 사유',{exact:true}).fill('가상 셀 보류 시연');await page.getByRole('button',{name:'셀 보류',exact:true}).click();
 await page.getByRole('button',{name:'용량별 재고 확인',exact:true}).click();await expect(page.getByRole('row').filter({hasText:'DEMO-0001'})).toContainText('보류');


 await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await expect(page.getByRole('dialog').locator('.id-list')).not.toContainText('DEMO-0001');await page.getByLabel('팩 일련번호').fill('CONNECTED-QUALITY');await page.getByLabel('조합 검토 사유',{exact:true}).fill('합성 시험 조합 검토');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();
 await page.getByRole('button',{name:'이 팩 검사로 이어가기'}).click();await expect(page.getByRole('dialog')).toHaveAttribute('aria-label','CONNECTED-QUALITY');
 await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await choose(page,'검사 구분','casing');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await choose(page,'검사 구분','final');await choose(page,'판정','fail');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'생산',exact:true}).click();await page.getByRole('button',{name:'생산 작업',exact:true}).click();await expect(page.locator('.console-target')).toContainText('CONNECTED-QUALITY');await expect(page.locator('.console-target')).toContainText('최종검사 불합격');
 await navigate(page,'팩 · 검사이력');await page.getByRole('button',{name:'상세 조회',exact:true}).click();await choose(page,'검사 구분','final');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.getByRole('button',{name:'이 팩 품질 검토 요청',exact:true}).click();
 await expect(page.getByRole('radiogroup',{name:'품질 검토 대상 팩',exact:true}).getByRole('radio',{name:'CONNECTED-QUALITY',exact:true})).toBeChecked();
 await page.getByLabel('검토 요청 사유',{exact:true}).fill('재검사 근거 확인 후 최종 승인 요청');await page.getByRole('button',{name:'팩 품질 검토 요청'}).click();await choose(page,'체험 역할','demo-reviewer');await expect(page.locator('.approval-detail > .section-head')).toContainText('케이싱 합격');if(width<800)await page.getByRole('button',{name:'근거 확인 후 최종 판단',exact:true}).click();await page.getByLabel('검토 의견').fill('공정 확인 및 재검사 결과 확인');await page.getByRole('button',{name:'제출본 승인',exact:true}).click();await expect(page.locator('.decision-focus')).not.toContainText('검토한 뒤 결정하세요');await expect(page.getByRole('button',{name:'품질 결과 확인',exact:true})).toBeInViewport();await page.screenshot({path:`test-results/role-quality-${width}.png`});await page.getByRole('button',{name:'품질 결과 확인',exact:true}).click();
 await expect(page.locator('.outcome-comparison article').nth(0)).toContainText('100%');await expect(page.locator('.outcome-comparison article').nth(1)).toContainText('0%');
 await navigate(page,'팩 · 검사이력');await expect(page.getByRole('row').filter({hasText:'CONNECTED-QUALITY'})).toContainText('품질 승인 완료');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:720});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('researcher compares, exports, edits and saves a separate process design',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 await page.getByRole('button',{name:'생산',exact:true}).click();const before=await page.locator('.floor-context-heading').innerText();
 await navigate(page,'알고리즘 검증');
 await expect(page.locator('.research-lab button').filter({hasText:'알고리즘 비교 실행'})).toBeDisabled();
 await page.getByRole('button',{name:'UConn 공개 데이터 불러오기'}).click();
 await expect(page.locator('.research-dataset')).toContainText('55셀');
 await step(page,'2. 비교 조건');await page.getByRole('button',{name:'알고리즘 비교 실행'}).click();
 await expect(page.getByRole('heading',{name:'3. 검증 결과'})).toBeVisible();
 await expect(page.locator('.research-cohort')).toHaveCount(3);
 await expect(page.locator('.research-cohort tbody tr')).toHaveCount(9);
 const results=await page.locator('.research-cohort tbody tr').first().innerText();expect(results).toContain('무작위 순서 조합');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'검증 보고서 내려받기'}).click();const dl=await downloadPromise;
 expect(dl.suggestedFilename()).toMatch(/JSI_연구검증_.*\.json/);
 const stream=await dl.createReadStream();const chunks=[];for await(const c of stream!)chunks.push(c);const report=JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\ufeff/,''));
 expect(report.dataset.cells).toHaveLength(55);expect(report.results).toHaveLength(3);expect(report.dataset_sha256).toMatch(/^[a-f0-9]{64}$/);expect(report.promotion.status).toContain('운영 미적용');
 await page.getByRole('button',{name:'생산',exact:true}).click();expect(await page.locator('.floor-context-heading').innerText()).toBe(before);
 await navigate(page,'알고리즘 검증');await expect(page.locator('.research-history button')).toHaveCount(1);await step(page,'최근 실험');await page.locator('.research-history button').click();await expect(page.getByRole('heading',{name:'3. 검증 결과'})).toBeVisible();await step(page,'2. 비교 조건');await expect(page.getByRole('button',{name:'알고리즘 비교 실행'})).toBeEnabled();await expect(page.getByLabel('재현 시드')).toHaveValue('20261014');
 await step(page,'공개 모델 추론');await page.getByRole('button',{name:'공개 모델 실행',exact:true}).click();await expect(page.locator('.pretrained-explorer')).toContainText('1,127.1 mAh');
 await step(page,'Severson 열화 이력');await expect(page.locator('.severson-chart')).toBeVisible();
 await navigate(page,'공정 관리');await page.getByRole('button',{name:'공정 구성',exact:true}).click();await step(page,'선택 장비 · 데이터 정의');await page.getByLabel('장비 이름',{exact:true}).fill('연구 검토용 식별 리더');await page.getByRole('button',{name:'장비·데이터 적용'}).click();
 await step(page,'저장·가져오기');await page.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();
 await page.getByRole('button',{name:'사용 안내',exact:true}).click();await expect(page.locator('.manual-current strong')).toHaveText('설계 저장과 가져오기');await expect(page.locator('.manual-spotlight')).toBeVisible();await page.screenshot({path:`test-results/role-research-help-${width}.png`});await page.getByRole('button',{name:'업무로 돌아가기',exact:true}).click();
 const exportPromise=page.waitForEvent('download');await page.getByRole('button',{name:'공정 JSON 내보내기',exact:true}).click();const design=await exportPromise;expect(design.suggestedFilename()).toContain('가상공정');
 await page.getByRole('button',{name:'시뮬레이션',exact:true}).click();await step(page,'모의 처리량·실행 기록');await page.getByRole('button',{name:'1초 진행',exact:true}).click();await expect(page.getByTestId('twin-tick')).toContainText('1초');await page.screenshot({path:`test-results/role-research-${width}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

});}

test('short phone can scroll from demo instructions to inventory and change pages',async({page})=>{
 await page.setViewportSize({width:320,height:480});await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계',exact:true}).click();
 await page.getByRole('button',{name:'다음 셀',exact:true}).click();await expect(page.locator('.cell-inventory tbody tr')).toHaveCount(6);await expect(page.locator('.console-pager > span:visible')).toHaveText('2 / 22');
 await page.locator('.cell-inventory tbody tr').first().getByRole('button',{name:'측정 검토',exact:true}).click();await expect(page.getByRole('button',{name:'측정 검토',exact:true}).first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});
