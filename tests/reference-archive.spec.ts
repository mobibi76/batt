import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {navigate,step} from './workspace';
import {readFileSync} from 'node:fs';
const archive=JSON.parse(readFileSync('src/research/referenceArchive.json','utf8'));
test('all research references keep usable fallback evidence with external sites blocked',async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('/batt/');await page.getByRole('button',{name:'샘플 데이터로 체험하기'}).click();await navigate(page,'알고리즘 검증');
 const groups=[['1. 연구 데이터','출처·전처리·다른 공개 데이터 활용 범위',['uconn-original','uconn-processed']],['공개 모델 추론','모델·입력 조건·라이선스',['uconn-model','uconn-features','uconn-license']],['Severson 열화 이력','시험 조건·자료 한계',['severson-data']],['데이터 검증','',['severson-paper','severson-doi','severson-code']]] as const;
 for(const [name,summary,ids] of groups){await step(page,name);if(summary)await page.locator('summary:visible').filter({hasText:summary}).click();
  for(const id of ids){const node=page.locator(`[data-reference-id="${id}"]`);await node.locator('summary').click();await expect(node).toContainText(archive.entries[id].scope);const pending=page.waitForEvent('download');await node.getByRole('button',{name:'출처·보관 범위 내려받기',exact:true}).click();const file=await pending;const chunks=[];for await(const c of (await file.createReadStream())!)chunks.push(c);const report=JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\ufeff/,''));expect(report.source_url).toBe(archive.entries[id].source_url);expect(report.archive_version).toBe(archive.version);await node.locator('summary').click();}
 }
 await step(page,'공개 모델 추론');const node=page.locator('[data-reference-id="uconn-license"]');await node.locator('summary').click();const pending=page.waitForEvent('download');await node.getByRole('button',{name:'MIT 라이선스·저작권 원문',exact:true}).click();const file=await pending;const chunks=[];for await(const c of (await file.createReadStream())!)chunks.push(c);expect(createHash('sha256').update(Buffer.concat(chunks)).digest('hex')).toBe(archive.entries['uconn-license'].assets[0].sha256);
 await page.route('**/research/UCONN-PROCESSED-LICENSE.txt',route=>route.fulfill({body:'changed source'}));await node.getByRole('button',{name:'MIT 라이선스·저작권 원문',exact:true}).click();await expect(node.getByRole('alert')).toContainText('해시 불일치');await expect(node).toContainText('위 출처 요약은 계속 확인');
 await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
