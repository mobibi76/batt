import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test('shared field keeps camera, process and pack through production and quality',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 const canvas=page.locator('.operational-scene canvas');await expect(canvas).toBeVisible();await canvas.evaluate(e=>e.setAttribute('data-retained','yes'));
 await expect(page.locator('.scene-label')).toHaveCount(6);
 await page.locator('[data-scene-stage="assembly"]').click();await expect(page.locator('.floor-context-heading')).toContainText('8셀 조합');
 await page.getByRole('button',{name:'품질',exact:true}).click();await expect(canvas).toHaveAttribute('data-retained','yes');await expect(page.locator('.floor-context-heading')).toContainText('8셀 조합');
 await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('SHARED-FIELD');await page.getByLabel('조합 검토 사유',{exact:true}).fill('같은 공정과 팩 유지 검증');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();
 await expect(page.locator('.floor-context-heading')).toContainText('모듈 검사');await expect(page.locator('.console-target')).toContainText('SHARED-FIELD');
 await page.getByRole('button',{name:'품질',exact:true}).click();await expect(page.locator('.console-target')).toContainText('SHARED-FIELD');await expect(page.locator('[data-scene-stage="module"]')).toHaveAttribute('aria-pressed','true');await expect(canvas).toHaveAttribute('data-retained','yes');
 await page.getByRole('button',{name:'생산',exact:true}).click();await page.getByRole('button',{name:'검사 확인·기록'}).click();await expect(page.locator('.console-confirmation')).toContainText('SHARED-FIELD');await page.getByRole('button',{name:'검사 입력 닫기'}).click();await expect(page.locator('.console-target')).toContainText('SHARED-FIELD');
});
test('operational process remains usable when WebGL is unavailable',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args:Parameters<typeof original>){if(String(args[0]).includes('webgl'))return null;return original.apply(this,args);} as typeof original;});
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await expect(page.locator('.twin-render-error')).toContainText('공정 이름을 선택');await page.locator('[data-scene-stage="storage"]').click();await expect(page.locator('.floor-context-heading')).toContainText('용량별 분류·보관');await page.getByRole('button',{name:'셀 재고 확인'}).click();await expect(page.getByPlaceholder('셀 ID 또는 LOT 검색')).toBeVisible();
});

test('small field fits every stage and moves between process and work',async({page})=>{
 await page.setViewportSize({width:800,height:480});await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await expect(page.locator('.operational-scene canvas')).toBeVisible();
 await expect.poll(async()=>page.locator('.scene-label').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}))).toBe(true);
 await page.locator('[data-scene-stage="storage"]').click();await expect(page.getByRole('button',{name:'셀 재고 확인',exact:true})).toBeInViewport();await page.getByRole('button',{name:'공정 전체 보기 ↑'}).click();await expect(page.locator('.floor-briefing')).toBeInViewport();
});
