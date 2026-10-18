import {test,expect} from '@playwright/test';

for(const width of [1366,390])test('process mode labels remain readable throughout both transitions at '+width,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.goto('/batt/');
 await page.getByRole('button',{name:'가상 데이터로 공정 체험',exact:true}).click();await page.getByRole('button',{name:'셀 검사·재고',exact:true}).click();
 await page.getByRole('button',{name:'연구',exact:true}).click();
 await page.getByRole('button',{name:'공정 설계·시뮬레이션',exact:true}).click();
 const switcher=page.locator('.console-task-heading .mode-switch');
 await expect(switcher).toBeVisible();
 const samples=await switcher.evaluate(async element=>{
  const buttons=Array.from(element.querySelectorAll('button'));
  const luminance=(color:string)=>{
   const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;});
   return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  const samples:{label:string;contrast:number}[]=[];
  for(const button of [buttons[1],buttons[0]]){
   button.click();
   for(let frame=0;frame<12;frame++){
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    for(const control of buttons){const style=getComputedStyle(control),a=luminance(style.color),b=luminance(style.backgroundColor);samples.push({label:control.textContent||'',contrast:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)});}
   }
  }
  return samples;
 });
 await page.screenshot({path:'test-results/mode-labels-'+width+'.png'});
 expect(samples.filter(sample=>sample.contrast<4.5),'Each mode label must remain readable while its selection changes').toEqual([]);
});
