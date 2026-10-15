import type {Page} from '@playwright/test';
export async function step(page:Page,name:string){
 const purpose=name==='데이터 검증'?'데이터 준비 검증':['공개 모델 추론','Severson 열화 이력'].includes(name)?'연구 모델·열화 관찰':/^\d\.|최근 실험/.test(name)?'조합 비교':null;
 if(purpose&&await page.getByRole('navigation',{name:'업무 목적'}).isVisible())await page.getByRole('navigation',{name:'업무 목적'}).getByRole('button',{name:purpose,exact:true}).click();
 const tools=page.getByRole('button',{name:'작업 도구',exact:true});
 if(await tools.isVisible())await tools.click();
 const nav=page.locator('.visible-task-tabs:visible').last();
 await nav.waitFor();const options=await nav.getByRole('button').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')||e.textContent||''));
 const value=options.find(x=>x===name)||options.find(x=>x.startsWith(name));
 if(!value)throw Error(`Missing task ${name}: ${options.join(', ')}`);
 await nav.getByRole('button',{name:value,exact:true}).click();
}
export async function navigate(page:Page,name:string){
 await page.locator('button:visible').filter({hasText:/^(관제|판단 화면으로)$/}).first().waitFor();
 if(!await page.getByRole('button',{name:'관제',exact:true}).isVisible())await page.getByRole('button',{name:'판단 화면으로'}).click();
 await page.getByRole('button',{name:name==='셀 매칭'?'현장':'관제',exact:true}).click();
 if(name==='운영 현황')return;
 const direct:Record<string,string>={'셀 매칭':'셀 매칭','셀 데이터':'데이터 관리','품질·공정 승인함':'품질 승인','사용자 관리':'권한 관리'};
 if(direct[name]){await page.locator('.console-footer').getByRole('button',{name:direct[name],exact:true}).click();return;}
 if(name==='팩 · 검사이력'){await page.getByRole('button',{name:'데이터 인입',exact:true}).click();await page.getByRole('button',{name:'누락 검사 확인'}).click();await page.getByRole('button',{name:'전체 팩 보기',exact:true}).click();return;}
 if(name==='공정 관리'){await page.getByRole('button',{name:'공정 개선',exact:true}).click();await page.getByRole('button',{name:'공정 설계·시뮬레이션'}).click();return;}
 await page.getByRole('button',{name:'분석·보고',exact:true}).click();await page.getByRole('button',{name:'초도·판단 근거',exact:true}).click();
 await page.getByRole('button',{name:name==='알고리즘 검증'?'알고리즘 검증':'비교 근거 확인',exact:true}).click();
 if(name==='품질 리포트')await step(page,'품질 리포트');
}
