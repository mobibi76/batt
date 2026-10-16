-- User-confirmed 2026-10-16 PoC contract: eight cells, capacity <=500mAh, OCV <=10mV.
-- Preserve v1 function and historical records. No customer data is embedded.
alter table public.cells alter column resistance_mohm drop not null;
alter table public.packs alter column sop_version set default 'JSI-SOP-v2';
create function public.sop_v2() returns jsonb language sql immutable set search_path='' as $$ select '{"version":"JSI-SOP-v2","cellCount":8,"limits":{"voltage_mv":10,"capacity_mah":500}}'::jsonb $$;
create or replace function public.approve_pack(cell_ids text[], serial text) returns uuid language plpgsql security definer set search_path='' as $$
declare pack_uuid uuid; n integer; dv numeric; dr numeric; dc numeric;
begin
  if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
  if cardinality(cell_ids)<>8 or (select count(distinct x) from unnest(cell_ids) x)<>8 then raise exception '서로 다른 셀 8개가 필요합니다'; end if;
  -- Stable lock order prevents concurrent approvals from assigning the same cell twice.
  perform 1 from public.cells where id=any(cell_ids) order by id for update;
  select count(*),max(voltage_mv)-min(voltage_mv),max(resistance_mohm)-min(resistance_mohm),max(capacity_mah)-min(capacity_mah)
    into n,dv,dr,dc from public.cells where id=any(cell_ids) and status='available';
  if n<>8 then raise exception '사용 불가능한 셀이 포함되어 있습니다. 다시 추천받으세요'; end if;
  if dv>(public.sop_v2()->'limits'->>'voltage_mv')::numeric or dc>(public.sop_v2()->'limits'->>'capacity_mah')::numeric then raise exception 'SOP 허용 편차를 초과했습니다'; end if;
  insert into public.packs(serial_no,sop_version) values(trim(serial),'JSI-SOP-v2') returning id into pack_uuid;
  insert into public.pack_cells(pack_id,cell_id,position) select pack_uuid,x,ord::smallint from unnest(cell_ids) with ordinality t(x,ord);
  update public.cells set status='used' where id=any(cell_ids);
  insert into public.audit_logs(action,details) values('pack_approved',jsonb_build_object('pack_id',pack_uuid,'cell_ids',cell_ids,'sop','JSI-SOP-v2','voltage_spread',dv,'resistance_spread',dr,'capacity_spread',dc));
  return pack_uuid;
end $$;
create or replace function public.review_evidence(batch uuid, cell text, next_state text, reason text, measurement jsonb default null) returns void language plpgsql security definer set search_path='' as $$
declare b public.intake_batches; oldrow jsonb; newrow jsonb;
begin
 if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 if coalesce(length(trim(reason)),0) not between 1 and 2000 or next_state not in ('ready','held','retest') then raise exception '처리 상태와 사유가 필요합니다'; end if;
 select * into b from public.intake_batches where id=batch for update;
 select value into oldrow from jsonb_array_elements(b.rows) where value->>'id'=cell;
 if oldrow is null then raise exception '측정행을 찾을 수 없습니다'; end if;
 if exists(select 1 from public.cells where id=cell and (status='used' or source_batch_id is distinct from batch)) then raise exception '재고로 확정된 셀은 원자료를 변경할 수 없습니다'; end if;
 newrow:=oldrow||jsonb_build_object('state',next_state);
 if measurement is not null then
  if coalesce(measurement->>'measured_at','') !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$' then raise exception '시간대가 있는 재검사 측정 시각이 필요합니다'; end if;
  perform (measurement->>'measured_at')::timestamptz;
  newrow:=newrow||jsonb_build_object('voltage_mv',measurement->'voltage_mv','resistance_mohm',measurement->'resistance_mohm','capacity_mah',measurement->'capacity_mah','measured_at',measurement->>'measured_at','retest_note',trim(reason));
 end if;
 perform public.validate_evidence_rows(jsonb_build_array(newrow));
 if next_state='ready' and (newrow->>'voltage_mv' is null or newrow->>'capacity_mah' is null) then raise exception '전압·용량이 없는 셀은 보류를 해제할 수 없습니다'; end if;
 update public.intake_batches set rows=(select jsonb_agg(case when value->>'id'=cell then newrow else value end order by ord) from jsonb_array_elements(b.rows) with ordinality t(value,ord)),revision=revision+1 where id=batch;
 update public.cells set voltage_mv=coalesce((newrow->>'voltage_mv')::numeric,voltage_mv),resistance_mohm=(newrow->>'resistance_mohm')::numeric,capacity_mah=coalesce((newrow->>'capacity_mah')::numeric,capacity_mah),measured_at=coalesce((newrow->>'measured_at')::timestamptz,measured_at),status=case when next_state='ready' and newrow->>'voltage_mv' is not null and newrow->>'capacity_mah' is not null then 'available' else 'held' end where id=cell and source_batch_id=batch;
 insert into public.evidence_events(batch_id,cell_id,action,reason,before_row,after_row) values(batch,cell,case when measurement is null then next_state else 'remeasured' end,trim(reason),oldrow,newrow);
end $$;
create or replace function public.approve_evidence_pack(run uuid, cell_ids text[], serial text, reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.matching_runs; b public.intake_batches; c jsonb; pack uuid;
begin
 if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 if coalesce(length(trim(reason)),0) not between 1 and 2000 then raise exception '조합 검토 사유가 필요합니다'; end if;
 select * into r from public.matching_runs where id=run;
 select * into b from public.intake_batches where id=r.batch_id for update;
 if r.id is null or r.result->>'sop_version' is distinct from 'JSI-SOP-v2' or b.revision<>r.batch_revision then raise exception '최신 자료로 다시 계산하세요'; end if;
 if b.source_kind='unknown' then raise exception '출처가 확인되지 않은 자료는 팩으로 확정할 수 없습니다'; end if;
 if not exists(select 1 from jsonb_array_elements((r.result->'alternatives')||(r.result->'recommended'->'groups')) g where g->>'status'='pass' and (select array_agg(x order by x) from jsonb_array_elements_text(g->'ids') x)=(select array_agg(x order by x) from unnest(cell_ids) x)) then raise exception '전체 SOP를 충족하는 기록된 후보만 확정할 수 있습니다'; end if;
 if (select count(distinct coalesce(value->>'lot','')) from jsonb_array_elements(b.rows) where value->>'id'=any(cell_ids))<>1 then raise exception '다른 LOT의 혼합 조합은 허용하지 않습니다'; end if;
 for c in select value from jsonb_array_elements(b.rows) where value->>'id'=any(cell_ids) loop
  if c->>'state'<>'ready' or c->>'measured_at' is null then raise exception '측정값·시간대·상태 확인이 필요합니다'; end if;
  insert into public.cells(id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at,source_name,source_kind,source_batch_id)
  values(c->>'id',coalesce(nullif(c->>'lot',''),'BATCH-'||b.id::text),(c->>'voltage_mv')::numeric,(c->>'resistance_mohm')::numeric,(c->>'capacity_mah')::numeric,(c->>'measured_at')::timestamptz,b.name,b.source_kind,b.id) on conflict(id) do nothing;
  if not exists(select 1 from public.cells where id=c->>'id' and source_batch_id=b.id and status='available' and voltage_mv=(c->>'voltage_mv')::numeric and resistance_mohm is not distinct from (c->>'resistance_mohm')::numeric and capacity_mah=(c->>'capacity_mah')::numeric) then raise exception '재고 출처·측정값·상태 충돌'; end if;
 end loop;
 pack:=public.approve_pack(cell_ids,serial);
 update public.packs set source_kind=b.source_kind,matching_run_id=run where id=pack;
 insert into public.audit_logs(action,details) values('evidence_pack_review',jsonb_build_object('pack_id',pack,'run_id',run,'reason',trim(reason),'source_kind',b.source_kind));
 return pack;
end $$;
create or replace function public.approve_recorded_pack(cell_ids text[],serial text,run uuid,reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; snapshot jsonb;
begin
 if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 if coalesce(length(trim(reason)),0) not between 1 and 2000 then raise exception '검토 사유가 필요합니다'; end if;
 perform 1 from public.intake_batches where id in (select source_batch_id from public.cells where id=any(cell_ids)) order by id for update;
 perform 1 from public.cells where id=any(cell_ids) order by id for update;
 if exists(select 1 from public.cells where id=any(cell_ids) and source_kind='unknown') then raise exception '출처 미확인 재고는 팩 확정할 수 없습니다'; end if;
 if (select count(distinct lot) from public.cells where id=any(cell_ids))<>1 then raise exception '다른 LOT의 혼합 조합은 허용하지 않습니다'; end if;
 select mr.result->'input_snapshot' into snapshot from public.matching_runs mr where mr.id=run;
 if exists(select 1 from public.cells c where c.id=any(cell_ids) and not exists(select 1 from jsonb_array_elements(snapshot) x where x->>'id'=c.id and (x->>'voltage_mv')::numeric=c.voltage_mv and (x->>'resistance_mohm')::numeric is not distinct from c.resistance_mohm and (x->>'capacity_mah')::numeric=c.capacity_mah and (x->>'measured_at')::timestamptz=c.measured_at)) then raise exception '추천 이후 측정값이 변경되었습니다. 다시 계산하세요'; end if;
 if not exists(select 1 from public.matching_runs mr where mr.id=run and mr.result->>'sop_version'='JSI-SOP-v2') then raise exception 'SOP v2로 다시 추천받으세요'; end if;
 result:=public.approve_recorded_pack_internal(cell_ids,serial,run);
 insert into public.audit_logs(action,details) values('recorded_pack_review',jsonb_build_object('pack_id',result,'run_id',run,'reason',trim(reason)));
 return result;
end $$;
create or replace function public.import_reviewed_intake(payload jsonb,note text,items jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare batch uuid;
begin
 if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 if payload->>'source_kind' not in ('measured','reconstructed','synthetic') then raise exception '출처를 지정하세요'; end if;
 if jsonb_array_length(items)<>jsonb_array_length(payload->'rows') or exists(select 1 from jsonb_array_elements(items) c where not exists(select 1 from jsonb_array_elements(payload->'rows') r where c->>'id'=r->>'id' and c->>'lot'=r->>'lot' and (c->>'voltage_mv')::numeric=(r->>'voltage_mv')::numeric and (c->>'resistance_mohm')::numeric is not distinct from (r->>'resistance_mohm')::numeric and (c->>'capacity_mah')::numeric=(r->>'capacity_mah')::numeric and (c->>'measured_at')::timestamptz=(r->>'measured_at')::timestamptz and r->>'state'='ready')) then raise exception '표준 입력과 검토 배치가 일치하지 않습니다'; end if;
 batch:=public.register_intake(payload,note);
 perform public.import_cells(items,payload->>'name');
 update public.cells set source_kind=payload->>'source_kind',source_batch_id=batch where id in (select value->>'id' from jsonb_array_elements(items));
 return batch;
end $$;
