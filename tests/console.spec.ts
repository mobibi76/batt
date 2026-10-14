import {choose} from './chips';
import {navigate,step} from './navigate';
import {test,expect} from '@playwright/test';
test('field and control replace content without scrolling across display sizes',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 for(const [width,height] of [[1366,768],[1024,600],[768,1024],[1920,1080],[320,480]]){
  await page.setViewportSize({width,height});
  for(const mode of ['현장','관제']){await page.getByRole('button',{name:mode,exact:true}).click();for(const button of await page.getByRole('navigation',{name:'작업 선택'}).getByRole('button').all()){
   await button.click();expect(await page.evaluate(()=>({x:document.documentElement.scrollWidth<=innerWidth,y:document.documentElement.scrollHeight<=innerHeight}))).toEqual({x:true,y:true});
   expect(await page.locator('.console-content').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
  }}
 }
 await page.getByRole('button',{name:'현장',exact:true}).click();await expect(page.getByRole('button',{name:'최종 품질',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'가상 실행',exact:true})).toHaveCount(0);
});
test('field confirmation uses existing pack data and does not perform quality approval',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('FIELD-001');await page.getByRole('button',{name:'확인 및 팩 구성',exact:true}).click();
 await page.getByRole('button',{name:'판단 화면으로'}).click();await page.getByRole('button',{name:'확인·조치',exact:true}).click();await page.getByRole('button',{name:'첫 대상 확인'}).click();await expect(page.locator('.console-target')).toContainText('FIELD-001');
 await page.getByRole('button',{name:'검사 확인·기록'}).click();await choose(page,'판정','fail');await page.getByRole('button',{name:'검사 메모·저장으로'}).click();await page.getByLabel('검사 메모',{exact:true}).fill('검사 조건 확인');await page.getByRole('button',{name:'검사 결과 저장',exact:true}).click();await expect(page.locator('.console-target')).toContainText('에이징 불합격');
 await page.locator('.console-footer').getByRole('button',{name:'팩·검사',exact:true}).click();await page.getByRole('button',{name:'판단 화면으로'}).click();await expect(page.locator('.console-target')).toContainText('FIELD-001');
 await page.getByRole('button',{name:'관제',exact:true}).click();await page.getByRole('button',{name:'최종 품질',exact:true}).click();await expect(page.locator('.console-decision')).toContainText('판단 대상이 없습니다');
});
