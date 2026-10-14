import Papa from 'papaparse';
import {type ResearchCell, validateResearch} from './engine';
export type Dataset = { id:string; title:string; source_url:string; license:string; condition:string; transform:string; citation:string; commit?:string; archive_sha256?:string; cells:ResearchCell[]; [key:string]:unknown };
export async function sha256(text:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function parseResearchCsv(text:string):ResearchCell[]{
 const parsed=Papa.parse<Record<string,string>>(text,{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim().replace(/^\ufeff/,'')});
 if(parsed.errors.length)throw Error('CSV 형식을 확인하세요.');
 const required=['id','cohort','voltage_mv','resistance_mohm','capacity_mah'];
 if(required.some(k=>!parsed.meta.fields?.includes(k)))throw Error('필수 컬럼: '+required.join(', '));
 const cells=parsed.data.map(r=>({id:r.id.trim(),cohort:r.cohort.trim(),voltage_mv:Number(r.voltage_mv),resistance_mohm:Number(r.resistance_mohm),capacity_mah:Number(r.capacity_mah),...(r.soc_pct?.trim()?{soc_pct:Number(r.soc_pct)}:{})}));
 validateResearch(cells,{voltage_mv:1,resistance_mohm:1,capacity_mah:1});return cells;
}
