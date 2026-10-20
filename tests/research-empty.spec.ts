import {test,expect} from '@playwright/test';
import {navigate,step,researchSide} from './workspace';
for(const width of [1366,834])test('research explains analysis before data '+width,async({page})=>{
 await page.setViewportSize({width,height:768});await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();await navigate(page,'알고리즘 검증');
 const active=page.locator('.task-step-panel:visible');await expect(active.getByRole('region',{name:'분석 미리보기'})).toBeVisible();await expect(active.locator('.decision-preview-chart')).toHaveCount(3);await expect(active.locator('.decision-empty-axis').first()).toContainText('자료 대기');await page.screenshot({path:'test-results/research-empty-'+width+'.png'});
 await active.getByRole('button',{name:'입력·설정 열기 →',exact:true}).click();await expect(active.locator('.research-import')).toHaveAttribute('open','');await expect(page.getByLabel('데이터 출처',{exact:true})).toBeFocused();await expect(page.getByLabel('데이터 출처',{exact:true})).toBeInViewport({ratio:1});
 await step(page,'2. 비교 조건');await researchSide(page,'evidence');await expect(active.getByRole('heading',{name:'8셀 조합 연구에 필요한 근거가 연결됐나요?'})).toBeVisible();
 await step(page,'1. 연구 데이터');await researchSide(page,'controls');expect(await active.locator('.field-study-controls').evaluate(e=>e.scrollTop)).toBe(0);
 await step(page,'3. 검증 결과');await researchSide(page,'evidence');await expect(active.locator('.decision-empty-axis').first()).toContainText('비교 실행 대기');
 await step(page,'4. 운영 적용 검토');await researchSide(page,'evidence');await expect(active.getByRole('heading',{name:'현장에 적용하기 전에 무엇을 확인해야 하나요?'})).toBeVisible();
 await step(page,'연구 문헌');await expect(page.getByRole('region',{name:'선택 연구 활용 범위'})).toContainText('고객 CSV와 비교');await page.getByRole('button',{name:'이 연구의 데이터 준비 비교',exact:true}).click();await expect(page.getByRole('button',{name:'고객 데이터 비교',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
