import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {navigate} from '../tests/workspace.ts';
const dir='.local/layout-audit';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(7000);
await page.goto('http://127.0.0.1:4173/batt/');await page.getByRole('button',{name:'등록된 가상 셀로 빠른 체험'}).click();
let i=0;const records:any[]=[];
async function snap(label:string){await page.locator('.notice').filter({hasText:/준비합니다|준비하고 있습니다/}).waitFor({state:'hidden',timeout:7000}).catch(()=>{});await page.waitForTimeout(200);for(const [width,height] of [[1366,900],[390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(400);const path=`${dir}/${String(i++).padStart(3,'0')}.png`;await page.screenshot({path});records.push({path,label,width,height,overflow:await page.evaluate(()=>Array.from(document.querySelectorAll('main,section,.panel,.choice-field,.console-task-body')).filter((e:any)=>e.getBoundingClientRect().width>0&&e.scrollWidth>e.clientWidth+2).map((e:any)=>({class:e.className,x:e.clientWidth,scroll:e.scrollWidth}))) });}await page.setViewportSize({width:1366,height:900});}
for(const task of ['운영 현황','팩 · 검사이력','셀 데이터','셀 매칭','품질·공정 승인함','사용자 관리','공정 관리','품질 리포트','알고리즘 검증']){try{await navigate(page,task);await snap(task);const nav=page.locator('.visible-task-tabs:visible').last();if(await nav.count()){const names=await nav.getByRole('button').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')||e.textContent||''));for(const name of names){await nav.getByRole('button',{name,exact:true}).click();await snap(task+'/'+name);}}}catch(e){records.push({task,error:String(e)});}}
await writeFile(`${dir}/index.json`,JSON.stringify(records,null,2));await browser.close();console.log(records.filter(x=>x.error||x.overflow?.length));
