import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
try{
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const f of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${f}`,'utf8'));
 const ids=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'];
 for(const [i,id] of ids.entries())await db.query('insert into auth.users(id,email) values($1,$2)',[id,`lit${i}@example.invalid`]);
 await db.query("update profiles set status='approved',role='operator',process_stages=array['assembly'] where id=any($1::uuid[])",[ids.slice(0,2)]);
 async function as(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);}
 await as(ids[0]);const paper=(await db.query("insert into research_literature(title,url,target,topic,purpose) values('Pack test','https://doi.org/10.1234/test','pack','life','Cycle life') returning id")).rows[0].id;
 await assert.rejects(()=>db.query("update research_literature set status='candidate' where id=$1",[paper]),/check/);
 await assert.rejects(()=>db.query("update research_literature set status='verified' where id=$1",[paper]),/check/);
 await db.query("update research_literature set status='candidate',inputs='curve',conditions='8S',evidence='independent test' where id=$1",[paper]);
 await assert.rejects(()=>db.query("insert into research_literature(title,url,target,topic,purpose) values('Duplicate','https://doi.org/10.1234/test/','pack','life','Life')"),/unique/);
 await as(ids[1]);assert.equal((await db.query('select * from research_literature')).rows.length,1);assert.equal((await db.query("update research_literature set title='tamper' where id=$1 returning id",[paper])).rows.length,0);assert.equal((await db.query('delete from research_literature where id=$1 returning id',[paper])).rows.length,0);
 await as(ids[2]);assert.equal((await db.query('select * from research_literature')).rows.length,0);await assert.rejects(()=>db.query("insert into research_literature(title,url,target,topic,purpose) values('Blocked','https://example.org/test','pack','life','Life')"),/row-level/);
 await as('','anon');await assert.rejects(()=>db.query('select * from research_literature'),/permission/);
 await as(ids[0]);await db.query('delete from research_literature where id=$1',[paper]);assert.equal((await db.query('select * from research_literature')).rows.length,0);
 console.log('PASS literature: migration, candidate evidence, status, duplicate, member sharing, owner writes, pending and anonymous restrictions');
}finally{await db.close();}
