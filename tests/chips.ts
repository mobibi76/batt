import type {Page} from '@playwright/test';
export async function choose(page:Page,label:string,value:string|{label:string}) {
 const group=page.getByRole('radiogroup',{name:label,exact:true});
 const radio=typeof value==='string'?group.locator('input[type=radio]').filter({visible:true}).and(group.locator(`input[value="${value}"]`)):group.getByRole('radio',{name:value.label,exact:true});
 await radio.locator('..').click();
}
