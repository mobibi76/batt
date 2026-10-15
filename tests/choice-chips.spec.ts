import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
import {choose} from './chips';
test('all tasks use visible chips and equipment can be selected and cleared',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();
 await page.getByRole('button',{name:'공정 공간',exact:true}).click();
 const equipment=page.getByRole('radiogroup',{name:'공정 장비 선택'}).getByRole('radio',{name:'식별 리더',exact:true});
 await equipment.locator('..').click();await expect(equipment).toBeChecked();await equipment.locator('..').click();await expect(equipment).not.toBeChecked();
 for(const task of ['운영 현황','셀 데이터','셀 매칭','팩 · 검사이력','품질 리포트','알고리즘 검증','공정 관리','품질·공정 승인함','사용자 관리']){await navigate(page,task);await expect(page.locator('select')).toHaveCount(0);}
});
test('large LOT choices are searchable and paginated while preserving selection',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'셀 데이터');
 const csv='id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at\n'+Array.from({length:12},(_,i)=>`CHIP-${i},LOT-CHIP-${String(i).padStart(2,'0')},3200,0.42,30000,2026-10-14T00:00:00Z`).join('\n');
 await page.locator('.upload-actions input[type=file]').setInputFiles({name:'chips.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.getByRole('button',{name:'전체 12개 등록'}).click();await navigate(page,'셀 매칭');
 const group=page.getByRole('radiogroup',{name:'대상 LOT',exact:true}),field=group.locator('..');await expect(group.getByRole('radio')).toHaveCount(8);
 const first=await group.getByRole('radio').first().getAttribute('value');await field.getByRole('button',{name:'다음 선택지'}).click();expect(await group.getByRole('radio').first().getAttribute('value')).not.toBe(first);
 await page.getByRole('textbox',{name:'대상 LOT 검색'}).fill('LOT-CHIP-11');await choose(page,'대상 LOT','LOT-CHIP-11');await expect(group.getByRole('radio',{name:'LOT-CHIP-11'})).toBeChecked();
 await page.getByRole('textbox',{name:'대상 LOT 검색'}).fill('없는 LOT');await expect(field).toContainText('일치하는 선택지가 없습니다.');await field.getByRole('button',{name:'선택: LOT-CHIP-11'}).click();await expect(group.getByRole('radio',{name:'LOT-CHIP-11'})).toBeChecked();
 await choose(page,'추천 팩 수','5');await expect(page.getByRole('radio',{name:'5팩',exact:true})).toBeChecked();await page.screenshot({path:'.local/chips-matching-390.png'});
});
test('required approval pack remains required and keyboard selection works',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'셀 매칭');await page.getByRole('button',{name:'조합 추천',exact:true}).click();await step(page,'8셀 추천 조합');await page.getByRole('button',{name:'조합 검토 · 확정'}).first().click();await page.getByLabel('팩 일련번호').fill('CHIP-REQUIRED');await page.getByLabel('조합 검토 사유',{exact:true}).fill('합성 시험 조합 검토');await page.getByRole('button',{name:'확인 및 팩 구성'}).click();
 await navigate(page,'품질·공정 승인함');await step(page,'새 검토 요청');await page.getByLabel('검토 요청 사유',{exact:true}).fill('필수 팩 선택 검증');await page.getByRole('button',{name:'팩 품질 검토 요청'}).click();
 const radio=page.getByRole('radio',{name:'CHIP-REQUIRED',exact:true});await expect(radio).toBeFocused();await expect(radio).not.toBeChecked();await page.keyboard.press('Space');await expect(radio).toBeChecked();
 expect(await page.locator('.approval-submit').evaluate(e=>new FormData(e as HTMLFormElement).get('pack'))).toBeTruthy();
});
