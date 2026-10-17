// Explicit authorized import into protected sample storage, never operational tables.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const [file,ref]=process.argv.slice(2);if(!file||!ref)throw Error('Usage: node scripts/upload-private-demo.mjs prepared.json project-ref');
if(!/^[a-z0-9]{20}$/.test(ref))throw Error('Invalid project reference');
let keys;try{keys=JSON.parse(execFileSync('cmd.exe',['/d','/s','/c',`node_modules\\.bin\\supabase.cmd projects api-keys --project-ref ${ref} --output json`],{encoding:'utf8',stdio:['pipe','pipe','pipe']}));}catch{throw Error('Could not obtain management credentials');}
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(`https://${ref}.supabase.co`,keys.find(k=>k.name==='service_role').api_key,options);
const anon=createClient(`https://${ref}.supabase.co`,keys.find(k=>k.name==='anon').api_key,options);
const payload=JSON.parse(await readFile(file,'utf8'));if(payload.version!==1||!payload.intake?.rows?.length)throw Error('Invalid dataset');
const r=await service.from('private_demo_datasets').upsert({id:'customer-grading-v1',payload,updated_at:new Date().toISOString()});if(r.error)throw Error(r.error.message);
const saved=await service.from('private_demo_datasets').select('payload').eq('id','customer-grading-v1').single();if(saved.error)throw Error(saved.error.message);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
if(digest(saved.data.payload)!==digest(payload))throw Error('Private sample read-back mismatch');
const check=await anon.from('private_demo_datasets').select('payload');if(!check.error&&check.data?.length)throw Error('Unexpected anonymous access');
console.log('Private sample imported and read-back verified. Anonymous access denied. No operational records changed.');
