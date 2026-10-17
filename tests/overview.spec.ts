import {prepareInspection} from './inspection';
import {choose} from './chips';
import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test.use({actionTimeout:10_000,trace:'retain-on-failure'});
test('quality metrics link the three inspections and distinguish first pass from latest',async({page})=>{
 // Four inspections and review span several workspaces; each action still has a 10s limit.
 test.setTimeout(60_000);
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await navigate(page,'운영 현황');
 const metric=(name:string)=>page.locator('.console-quality-summary button').filter({hasText:name}).locator('strong');
 await expect(metric('최종 불량률')).toHaveText('—');
 await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('QUALITY-OVERVIEW');await page.getByLabel('조합 검토 사유',{exact:true}).fill('합성 시험 조합 검토');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();
 await navigate(page,'운영 현황');await expect(metric('검사 연결률')).toHaveText('0%');
 await navigate(page,'팩 · 검사이력');await page.getByRole('button',{name:'상세 조회'}).click();
 for(const kind of ['module','casing','final']){await prepareInspection(page);await choose(page,'검사 구분',kind);if(kind==='final')await choose(page,'판정','fail');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();}
 await page.getByRole('button',{name:'닫기',exact:true}).click();await navigate(page,'운영 현황');await expect(metric('검사 연결률')).toHaveText('100%');await expect(metric('최종 불량률')).toHaveText('100%');
 await navigate(page,'팩 · 검사이력');await page.getByRole('button',{name:'상세 조회'}).click();await prepareInspection(page);await choose(page,'검사 구분','final');await prepareInspection(page,true);await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await navigate(page,'품질 리포트');await step(page,'품질 비교');await expect(page.locator('.outcome-comparison article').first().locator('strong')).toHaveText('100%');await expect(page.locator('.outcome-comparison article').last().locator('strong')).toHaveText('0%');
 await step(page,'품질 리포트');const dl=page.waitForEvent('download');await page.getByRole('button',{name:'보고서 내려받기',exact:true}).click();const stream=await (await dl).createReadStream();let text='';for await(const chunk of stream!)text+=chunk.toString('utf8');expect(text).toContain('초도 최종검사 불량률: 100.00%');
 await step(page,'품질 비교');await choose(page,'비교 집계 대상','measured');await expect(page.locator('.outcome-comparison article').first().locator('strong')).toHaveText('—');
});
