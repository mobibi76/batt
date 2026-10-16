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
 if(!await page.getByRole('button',{name:'품질',exact:true}).isVisible())await page.getByRole('button',{name:/^(생산|품질|연구) 홈$/}).click();
 const mode=['셀 매칭','셀 데이터'].includes(name)?'생산':['공정 관리','알고리즘 검증'].includes(name)?'연구':'품질';
 await page.getByRole('button',{name:mode,exact:true}).click();
 if(name==='운영 현황')return;
 if(name==='사용자 관리'){await page.getByRole('button',{name:'권한 관리',exact:true}).click();return;}
 const labels:Record<string,string>={'셀 매칭':'8셀 조합','셀 데이터':'셀 검사·재고','팩 · 검사이력':'검사·조치 이력','품질·공정 승인함':'품질 승인','공정 관리':'공정 설계·시뮬레이션','알고리즘 검증':'데이터·AI 검증','품질 리포트':'분석·보고'};
 await page.getByRole('navigation',{name:'작업 선택'}).getByRole('button',{name:labels[name],exact:true}).click();
 if(name==='품질 리포트')await step(page,'품질 리포트');
}
