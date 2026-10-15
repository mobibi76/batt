-- Staging retains incomplete measurements; canonical inventory remains strictly complete.
create table public.intake_batches (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 200),
 file_hash text not null check(file_hash ~ '^[a-f0-9]{64}$'), source_kind text not null check(source_kind in ('measured','reconstructed','synthetic','unknown')),
 mapping_version text not null, source_note text not null check(length(trim(source_note)) between 1 and 2000),
 original_headers jsonb not null default '[]', original_rows jsonb not null, rows jsonb not null, revision integer not null default 1,
 created_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now(),
 unique(file_hash,created_by)
);
create table public.evidence_events (
 id bigint generated always as identity primary key, batch_id uuid not null references public.intake_batches(id),
 cell_id text not null, action text not null, reason text not null, before_row jsonb, after_row jsonb,
 created_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now()
);
create table public.matching_runs (
 id uuid primary key default gen_random_uuid(), batch_id uuid references public.intake_batches(id),
 batch_revision integer not null, result jsonb not null, created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
alter table public.intake_batches enable row level security;
alter table public.evidence_events enable row level security;
alter table public.matching_runs enable row level security;
create policy intake_read on public.intake_batches for select to authenticated using(public.is_member());
create policy evidence_read on public.evidence_events for select to authenticated using(public.is_member());
create policy runs_read on public.matching_runs for select to authenticated using(public.is_member());
revoke all on public.intake_batches,public.evidence_events,public.matching_runs from anon,authenticated;
grant select on public.intake_batches,public.evidence_events,public.matching_runs to authenticated;

create function public.validate_evidence_rows(items jsonb) returns void language plpgsql set search_path='' as $$
declare r jsonb; k text; measured_value numeric; scale numeric;
begin
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 5000 then raise exception '측정행은 1~5000개가 필요합니다'; end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(items) x)<>jsonb_array_length(items) then raise exception '셀 ID 중복 또는 누락'; end if;
 for r in select value from jsonb_array_elements(items) loop
  if coalesce(length(r->>'id'),0) not between 1 and 80 or coalesce(r->>'state','') not in ('ready','held','retest') then raise exception '셀 식별·상태 오류'; end if;
  foreach k in array array['voltage_mv','resistance_mohm','capacity_mah'] loop
   if not(r ? k) then raise exception '측정 키 누락'; end if;
   if r->>k is not null then
    measured_value:=(r->>k)::numeric; scale:=case when k='resistance_mohm' then 100000 else 1000 end;
    if measured_value<=0 or measured_value>=(case k when 'voltage_mv' then 10000 when 'resistance_mohm' then 1000 else 1000000 end) or measured_value*scale<>trunc(measured_value*scale) then raise exception '측정값·단위·정밀도 오류'; end if;
   end if;
  end loop;
 end loop;
end $$;
create function public.register_intake(payload jsonb, note text) returns uuid language plpgsql security definer set search_path='' as $$
declare batch uuid;
begin
 if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 if octet_length(payload::text)>12000000 then raise exception '등록 자료가 너무 큽니다'; end if;
 perform public.validate_evidence_rows(payload->'rows');
 insert into public.intake_batches(name,file_hash,source_kind,mapping_version,source_note,original_headers,original_rows,rows)
 values(payload->>'name',payload->>'hash',payload->>'source_kind',payload->>'mapping_version',trim(note),coalesce(payload->'headers','[]'),payload->'rows',payload->'rows') returning id into batch;
 insert into public.audit_logs(action,details) values('intake_registered',jsonb_build_object('batch_id',batch,'hash',payload->>'hash','source_kind',payload->>'source_kind'));
 return batch;
end $$;

alter table public.cells add column source_kind text not null default 'unknown' check(source_kind in ('measured','reconstructed','synthetic','unknown'));
alter table public.cells add column source_batch_id uuid references public.intake_batches(id);
alter table public.packs add column source_kind text not null default 'unknown' check(source_kind in ('measured','reconstructed','synthetic','unknown','mixed'));
alter table public.packs add column matching_run_id uuid references public.matching_runs(id);
alter table public.inspections add column evidence_kind text not null default 'unknown' check(evidence_kind in ('measured','test','unknown'));

create function public.review_evidence(batch uuid, cell text, next_state text, reason text, measurement jsonb default null) returns void language plpgsql security definer set search_path='' as $$
declare b public.intake_batches; oldrow jsonb; newrow jsonb;
begin
 if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 if coalesce(length(trim(reason)),0) not between 1 and 2000 or next_state not in ('ready','held','retest') then raise exception '처리 상태와 사유가 필요합니다'; end if;
 select * into b from public.intake_batches where id=batch for update;
 select value into oldrow from jsonb_array_elements(b.rows) where value->>'id'=cell;
 if oldrow is null then raise exception '측정행을 찾을 수 없습니다'; end if;
 if exists(select 1 from public.cells where id=cell) then raise exception '재고로 확정된 셀은 원자료를 변경할 수 없습니다'; end if;
 newrow:=oldrow||jsonb_build_object('state',next_state);
 if measurement is not null then
  if coalesce(measurement->>'measured_at','') !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$' then raise exception '시간대가 있는 재검사 측정 시각이 필요합니다'; end if;
  perform (measurement->>'measured_at')::timestamptz;
  newrow:=newrow||jsonb_build_object('voltage_mv',measurement->'voltage_mv','resistance_mohm',measurement->'resistance_mohm','capacity_mah',measurement->'capacity_mah','measured_at',measurement->>'measured_at','retest_note',trim(reason));
 end if;
 perform public.validate_evidence_rows(jsonb_build_array(newrow));
 if next_state='ready' and (newrow->>'voltage_mv' is null or newrow->>'capacity_mah' is null) then raise exception '전압·용량이 없는 셀은 보류를 해제할 수 없습니다'; end if;
 update public.intake_batches set rows=(select jsonb_agg(case when value->>'id'=cell then newrow else value end order by ord) from jsonb_array_elements(b.rows) with ordinality t(value,ord)),revision=revision+1 where id=batch;
 insert into public.evidence_events(batch_id,cell_id,action,reason,before_row,after_row) values(batch,cell,case when measurement is null then next_state else 'remeasured' end,trim(reason),oldrow,newrow);
end $$;

-- Only the authenticated Edge worker may persist authoritative calculation output.
create function public.commit_matching_run(batch uuid, expected_revision integer, actor uuid, output jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.intake_batches; run uuid;
begin
 if not exists(select 1 from public.profiles where id=actor and status='approved' and role='operator' and 'assembly'=any(process_stages)) then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 select * into b from public.intake_batches where id=batch for update;
 if b.id is null or b.revision<>expected_revision or output->'input_snapshot' is distinct from b.rows then raise exception '계산 중 자료가 변경되었습니다. 다시 실행하세요'; end if;
 insert into public.matching_runs(batch_id,batch_revision,result,created_by) values(batch,expected_revision,output,actor) returning id into run;
 return run;
end $$;

create function public.approve_evidence_pack(run uuid, cell_ids text[], serial text, reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.matching_runs; b public.intake_batches; c jsonb; pack uuid;
begin
 if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 if coalesce(length(trim(reason)),0) not between 1 and 2000 then raise exception '조합 검토 사유가 필요합니다'; end if;
 select * into r from public.matching_runs where id=run;
 select * into b from public.intake_batches where id=r.batch_id for update;
 if r.id is null or b.revision<>r.batch_revision then raise exception '최신 자료로 다시 계산하세요'; end if;
 if b.source_kind='unknown' then raise exception '출처가 확인되지 않은 자료는 팩으로 확정할 수 없습니다'; end if;
 if not exists(select 1 from jsonb_array_elements((r.result->'alternatives')||(r.result->'recommended'->'groups')) g where g->>'status'='pass' and (select array_agg(x order by x) from jsonb_array_elements_text(g->'ids') x)=(select array_agg(x order by x) from unnest(cell_ids) x)) then raise exception '전체 SOP를 충족하는 기록된 후보만 확정할 수 있습니다'; end if;
 for c in select value from jsonb_array_elements(b.rows) where value->>'id'=any(cell_ids) loop
  if c->>'state'<>'ready' or c->>'resistance_mohm' is null or c->>'measured_at' is null then raise exception '측정값·시간대·상태 확인이 필요합니다'; end if;
  insert into public.cells(id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at,source_name,source_kind,source_batch_id)
  values(c->>'id','BATCH-'||b.id::text,(c->>'voltage_mv')::numeric,(c->>'resistance_mohm')::numeric,(c->>'capacity_mah')::numeric,(c->>'measured_at')::timestamptz,b.name,b.source_kind,b.id);
 end loop;
 pack:=public.approve_pack(cell_ids,serial);
 update public.packs set source_kind=b.source_kind,matching_run_id=run where id=pack;
 insert into public.audit_logs(action,details) values('evidence_pack_review',jsonb_build_object('pack_id',pack,'run_id',run,'reason',trim(reason),'source_kind',b.source_kind));
 return pack;
end $$;

-- Preserve the established independent approval/supersession logic.
alter function public.record_inspection(uuid,text,text,text) rename to record_inspection_legacy;
create function public.record_inspection(target_pack uuid,test_kind text,test_result text,test_note text default '',result_kind text default 'test') returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
 if result_kind not in ('measured','test') then raise exception '실측/시험 검사 구분을 선택하세요'; end if;
 result_id:=public.record_inspection_legacy(target_pack,test_kind,test_result,test_note);
 update public.inspections set evidence_kind=result_kind where id=result_id;
 return result_id;
end $$;
create function public.import_cells_with_source(rows jsonb,source text,kind text) returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if kind not in ('measured','reconstructed','synthetic') then raise exception '자료 출처를 지정하세요'; end if;
 n:=public.import_cells(rows,source);
 update public.cells set source_kind=kind where id in (select value->>'id' from jsonb_array_elements(rows));
 return n;
end $$;
create function public.stamp_pack_source() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.packs set source_kind=(select case when count(distinct c.source_kind)=1 then min(c.source_kind) else 'mixed' end from public.pack_cells pc join public.cells c on c.id=pc.cell_id where pc.pack_id=new.pack_id) where id=new.pack_id;
 return new;
end $$;
create trigger pack_source after insert on public.pack_cells for each row execute function public.stamp_pack_source();

create table public.research_runs (
 id uuid primary key, created_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now(),
 report jsonb not null check(octet_length(report::text)<3000000), origin text not null default 'browser-research' check(origin='browser-research')
);
alter table public.research_runs enable row level security;
create policy research_read on public.research_runs for select to authenticated using(public.is_member() and created_by=auth.uid());
create policy research_write on public.research_runs for insert to authenticated with check(public.can_operate() and created_by=auth.uid());
revoke all on public.research_runs from anon,authenticated;
grant select,insert on public.research_runs to authenticated;

revoke all on function public.validate_evidence_rows(jsonb),public.register_intake(jsonb,text),public.review_evidence(uuid,text,text,text,jsonb),public.commit_matching_run(uuid,integer,uuid,jsonb),public.approve_evidence_pack(uuid,text[],text,text),public.record_inspection_legacy(uuid,text,text,text),public.record_inspection(uuid,text,text,text,text),public.import_cells_with_source(jsonb,text,text),public.stamp_pack_source() from public,anon,authenticated;
grant execute on function public.register_intake(jsonb,text),public.review_evidence(uuid,text,text,text,jsonb),public.approve_evidence_pack(uuid,text[],text,text),public.record_inspection(uuid,text,text,text,text),public.import_cells_with_source(jsonb,text,text) to authenticated;
grant execute on function public.commit_matching_run(uuid,integer,uuid,jsonb) to service_role;

create function public.commit_standard_run(actor uuid, output jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare run uuid;
begin
 if not exists(select 1 from public.profiles where id=actor and status='approved' and role='operator' and 'assembly'=any(process_stages)) then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 insert into public.matching_runs(batch_id,batch_revision,result,created_by) values(null,1,output,actor) returning id into run;
 return run;
end $$;
create function public.approve_recorded_pack(cell_ids text[],serial text,run uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.matching_runs; pack uuid;
begin
 if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 select * into r from public.matching_runs where id=run and batch_id is null;
 if r.id is null or not exists(select 1 from jsonb_array_elements(r.result->'groups') g where (select array_agg(x order by x) from jsonb_array_elements_text(g->'cell_ids') x)=(select array_agg(x order by x) from unnest(cell_ids) x)) then raise exception '기록된 추천 조합을 선택하세요'; end if;
 pack:=public.approve_pack(cell_ids,serial);
 update public.packs set matching_run_id=run where id=pack;
 return pack;
end $$;
revoke all on function public.commit_standard_run(uuid,jsonb),public.approve_recorded_pack(text[],text,uuid) from public,anon,authenticated;
grant execute on function public.commit_standard_run(uuid,jsonb) to service_role;
grant execute on function public.approve_recorded_pack(text[],text,uuid) to authenticated;

create function public.review_evidence_group(batch uuid,cell_ids text[],next_state text,reason text) returns void language plpgsql security definer set search_path='' as $$
declare cell text;
begin
 if cardinality(cell_ids)<>8 or next_state not in ('held','retest') then raise exception '8셀 조합의 보류 또는 재검사를 선택하세요'; end if;
 foreach cell in array cell_ids loop
  perform public.review_evidence(batch,cell,next_state,reason,null);
 end loop;
end $$;
revoke all on function public.review_evidence_group(uuid,text[],text,text) from public,anon,authenticated;
grant execute on function public.review_evidence_group(uuid,text[],text,text) to authenticated;
