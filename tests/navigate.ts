import type {Page} from '@playwright/test';
export async function navigate(page:Page,name:string){
 if(name==='운영 현황'){await page.getByRole('button',{name:'관제',exact:true}).click();await page.getByRole('button',{name:'운영 지표',exact:true}).click();return;}
 const mode=name==='셀 매칭'?'현장':'관제';
 const direct=page.locator('.sidebar').getByRole('button',{name,exact:true});
 if(await direct.isVisible()){await direct.click();return;}
 await page.getByRole('button',{name:mode,exact:true}).click();
 if(mode==='현장'){await page.locator('.console-footer').getByRole('button',{name:'셀 매칭',exact:true}).click();return;}
 await page.getByRole('button',{name:'운영 지표',exact:true}).click();
 if(name==='품질 리포트'||name==='알고리즘 검증'){await page.locator('.sidebar').getByRole('button',{name:'품질 분석',exact:true}).click();await page.getByRole('navigation',{name:'업무 단계'}).getByRole('button',{name,exact:true}).click();}
 else await page.locator('.sidebar').getByRole('button',{name,exact:true}).click();
}
