import type {Page} from '@playwright/test';
/** Test actor explicitly chooses a judgement; production never supplies this default. */
export async function prepareInspection(page:Page,advance=false){
 const tab=page.getByRole('button',{name:'검사 기록',exact:true});if(await tab.isVisible())await tab.click();
 const next=page.getByRole('button',{name:'검사 메모·저장으로',exact:true});
 if(!await next.isVisible())return;
 const result=page.getByRole('radiogroup',{name:'판정',exact:true});
 if(await result.locator('input:checked').count()===0)await result.locator('input[value="pass"]').check();
 const evidence=page.getByRole('radiogroup',{name:'현장 검사 근거',exact:true});
 if(await evidence.locator('input:checked').count()===0)await evidence.getByRole('radio',{name:'시험 검사',exact:true}).check();
 if(advance)await next.click();
}
