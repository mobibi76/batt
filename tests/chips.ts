import type {Page} from '@playwright/test';
export async function choose(page:Page,label:string,value:string|{label:string}) {
 if(['판정','검사 구분','현장 검사 근거'].includes(label)){const tab=page.getByRole('button',{name:'검사 기록',exact:true});if(await tab.isVisible())await tab.click();}
 const group=page.getByRole('radiogroup',{name:label,exact:true});
 const radio=typeof value==='string'?group.locator('input[type=radio]').filter({visible:true}).and(group.locator(`input[value="${value}"]`)):group.getByRole('radio',{name:value.label,exact:true});
 await radio.locator('..').click();
}
