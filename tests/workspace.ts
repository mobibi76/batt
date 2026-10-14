import type {Page} from '@playwright/test';
export async function step(page:Page,name:string){
 const tools=page.getByRole('button',{name:'작업 도구',exact:true});
 if(await tools.isVisible())await tools.click();
 const nav=page.locator('.visible-task-tabs:visible').last();
 await nav.waitFor();const options=await nav.getByRole('button').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')||e.textContent||''));
 const value=options.find(x=>x===name)||options.find(x=>x.startsWith(name));
 if(!value)throw Error(`Missing task ${name}: ${options.join(', ')}`);
 await nav.getByRole('button',{name:value,exact:true}).click();
}
export async function navigate(page:Page,name:string){
 if(!await page.getByRole('button',{name:'관제',exact:true}).isVisible())await page.getByRole('button',{name:'판단 화면으로'}).click();
 await page.getByRole('button',{name:name==='셀 매칭'?'현장':'관제',exact:true}).click();
 if(name==='운영 현황')return;
 const direct:Record<string,string>={'셀 매칭':'셀 매칭','셀 데이터':'데이터 관리','품질·공정 승인함':'품질 승인','사용자 관리':'권한 관리'};
 if(direct[name]){await page.locator('.console-footer').getByRole('button',{name:direct[name],exact:true}).click();return;}
 if(name==='팩 · 검사이력'){await page.getByRole('button',{name:'데이터 인입',exact:true}).click();await page.getByRole('button',{name:'누락 검사 확인'}).click();return;}
 if(name==='공정 관리'){await page.getByRole('button',{name:'공정 개선',exact:true}).click();await page.getByRole('button',{name:'공정 설계·시뮬레이션'}).click();return;}
 await page.getByRole('button',{name:'분석·보고',exact:true}).click();
 await page.getByRole('button',{name:name==='알고리즘 검증'?'알고리즘 검증':'비교 근거 확인',exact:true}).click();
 if(name==='품질 리포트')await step(page,'품질 리포트');
}
