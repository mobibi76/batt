import {test,expect} from '@playwright/test';
import {navigate,step} from './workspace';
test('v2 retains missing IR, recommends field groups, records retest and preserves evidence',async({page})=>{
 await page.goto('/batt/');await page.getByRole('button',{name:'가상 데이터로 공정 체험'}).click();await page.getByRole('button',{name:'예시 셀로 다음 단계'}).click();await page.getByRole('button',{name:'생산 홈',exact:true}).click();await navigate(page,'셀 데이터');await step(page,'고객 자료 검토');
 const csv=['id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at',...Array.from({length:24},(_,i)=>`EVID-${i},FIXTURE,${i===0?3200:3300+i%3},,${25000+i*10},2026-10-15T09:00:00+09:00`)].join('\n');
 await page.locator('.evidence-workspace input[type=file]').setInputFiles({name:'synthetic-evidence.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.getByRole('radiogroup',{name:'고객 자료 출처'}).getByRole('radio',{name:'합성 시험자료',exact:true}).check();
 await page.getByLabel('측정 조건·가공 설명').fill('합성 시험 데이터 · 미측정 저항을 보간하지 않음');await page.getByRole('button',{name:'원자료 배치 등록',exact:true}).click();
 await page.getByRole('button',{name:'현장 기준',exact:true}).click();await expect(page.locator('.evidence-workspace')).toContainText('후보 2팩 (16셀)');await expect(page.getByLabel('용량 차 검토 목표 (mAh)')).toHaveValue('500');await page.getByLabel('용량 차 검토 목표 (mAh)').selectOption('50');await expect(page.locator('.evidence-workspace')).toContainText('후보 0팩');await page.getByRole('button',{name:'조합 비교',exact:true}).click();await page.getByRole('button',{name:'배치 조합 비교 실행'}).click();await page.getByRole('button',{name:'대안 선택',exact:true}).click();await expect(page.locator('.evidence-workspace')).toContainText('전체 SOP 적합');
 await page.getByRole('button',{name:'이 후보 검토'}).first().click();await expect(page.getByRole('button',{name:'서버 검증 후 팩 구성'})).toBeDisabled();
 await page.getByLabel('후보 검토 사유').fill('내부저항 재측정 필요');await page.getByRole('button',{name:'조합 재검사 요청',exact:true}).click();await expect(page.locator('.evidence-workspace')).toContainText('자료 변경 전 결과');
 await page.getByRole('button',{name:'실행·처리 이력',exact:true}).click();await expect(page.locator('.evidence-workspace tbody tr')).toHaveCount(8);
 await page.getByRole('button',{name:'측정·재검사',exact:true}).click();await page.getByRole('button',{name:'측정 검토'}).first().click();await page.getByLabel('처리 사유',{exact:true}).fill('장비 재측정 시험');await page.getByRole('button',{name:'재측정값 입력'}).click();await page.getByLabel('내부저항 mΩ',{exact:true}).fill('0.42');await page.getByLabel('측정 시각 (ISO·시간대 포함)').fill('2026-10-15T10:00:00+09:00');await page.getByRole('button',{name:'재검사 결과 기록'}).click();
 await expect(page.locator('.evidence-workspace')).toContainText('현재 측정');
 for(const width of [1366,768,390,320]){await page.setViewportSize({width,height:768});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:1366,height:768});await page.screenshot({path:'test-results/evidence-retest.png',fullPage:true});
});
