-- Preserve provenance across stock drawn from more than one original batch.
create function public.inventory_review_targets(cell_ids text[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare missing text[]; kind text; result jsonb;
begin
 if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
 if coalesce(cardinality(cell_ids),0) not between 1 and 5000 then raise exception '1~5000개 셀을 선택하세요'; end if;
 perform 1 from public.cells where id=any(cell_ids) order by id for update;
 if (select count(*) from public.cells where id=any(cell_ids) and status<>'used')<>cardinality(cell_ids) then raise exception '사용 불가능한 셀이 포함되어 있습니다'; end if;
 for kind in select distinct source_kind from public.cells where id=any(cell_ids) and source_batch_id is null loop
  select array_agg(id order by id) into missing from public.cells where id=any(cell_ids) and source_batch_id is null and source_kind=kind;
  perform public.open_inventory_review(missing);
 end loop;
 select jsonb_agg(t order by t.batch_id) into result from (select b.id batch_id,b.name,array_agg(c.id order by c.id) cell_ids from public.cells c join public.intake_batches b on b.id=c.source_batch_id where c.id=any(cell_ids) group by b.id,b.name) t;
 return result;
end $$;

alter table public.evidence_events add column actor_name text;
create function public.capture_evidence_actor() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select coalesce(nullif(display_name,''),new.created_by::text) into new.actor_name from public.profiles where id=new.created_by;
 return new;
end $$;
create trigger evidence_actor before insert on public.evidence_events for each row execute function public.capture_evidence_actor();
create function public.capture_pack_review_actor() returns trigger language plpgsql security definer set search_path='' as $$
declare who text;
begin
 if new.action in ('evidence_pack_review','recorded_pack_review') then
  select display_name into who from public.profiles where id=new.actor;
  new.details:=new.details||jsonb_build_object('actor_name',coalesce(nullif(who,''),new.actor::text));
 end if;
 return new;
end $$;
create trigger pack_review_actor before insert on public.audit_logs for each row execute function public.capture_pack_review_actor();

-- Only a specific pack's business evidence is exposed, never general audit logs.
create function public.pack_decision_context(target_pack uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.packs; result jsonb;
begin
 if not public.is_member() then raise exception '승인된 구성원 권한이 필요합니다'; end if;
 select * into p from public.packs where id=target_pack;
 if not found then raise exception '팩을 찾을 수 없습니다'; end if;
 select jsonb_build_object('run', (select to_jsonb(r) from public.matching_runs r where r.id=p.matching_run_id),
 'reviews',coalesce((select jsonb_agg(jsonb_build_object('reason',a.details->>'reason','actor',a.actor,'actor_name',a.details->>'actor_name','created_at',a.created_at) order by a.id) from public.audit_logs a where a.details->>'pack_id'=target_pack::text and a.action in ('evidence_pack_review','recorded_pack_review')),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from public.evidence_events e join public.pack_cells pc on pc.cell_id=e.cell_id and pc.pack_id=target_pack join public.cells c on c.id=pc.cell_id and c.source_batch_id=e.batch_id where e.created_at<=p.created_at),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.capture_quality_context() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='pack' then new.snapshot:=new.snapshot||jsonb_build_object('decision_context',public.pack_decision_context(new.pack_id)); end if;
 return new;
end $$;
create trigger quality_context before insert on public.quality_requests for each row execute function public.capture_quality_context();
revoke all on function public.inventory_review_targets(text[]),public.pack_decision_context(uuid),public.capture_evidence_actor(),public.capture_quality_context(),public.capture_pack_review_actor() from public,anon,authenticated;
grant execute on function public.inventory_review_targets(text[]),public.pack_decision_context(uuid) to authenticated;

create or replace function public.validate_evidence_rows(items jsonb) returns void language plpgsql set search_path='' as $$
declare r jsonb; k text; measured_value numeric; scale numeric;
begin
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 5000 then raise exception '측정행은 1~5000개가 필요합니다'; end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(items) x)<>jsonb_array_length(items) then raise exception '셀 ID 중복 또는 누락'; end if;
 for r in select value from jsonb_array_elements(items) loop
  if coalesce(length(r->>'id'),0) not between 1 and 80 or coalesce(r->>'state','') not in ('ready','held','retest') then raise exception '셀 식별·상태 오류'; end if;
  if jsonb_typeof(r->'id') is distinct from 'string' or jsonb_typeof(r->'channel') is distinct from 'string' or jsonb_typeof(r->'row_no') is distinct from 'number' or (r->>'row_no')::numeric<1 or (r->>'row_no')::numeric<>trunc((r->>'row_no')::numeric) then raise exception '행 번호·식별자 형식 오류'; end if;
  if jsonb_typeof(r->'issues') is distinct from 'array' then raise exception '검토 사항은 배열이어야 합니다'; end if;
  if exists(select 1 from jsonb_array_elements(r->'issues') v where jsonb_typeof(v)<>'string') then raise exception '검토 사항은 문자열이어야 합니다'; end if;
  if r->>'lot' is not null and jsonb_typeof(r->'lot')<>'string' then raise exception 'LOT 형식 오류'; end if;
  if r->>'measured_at' is not null then
   if jsonb_typeof(r->'measured_at')<>'string' or r->>'measured_at' !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$' then raise exception '시간대가 있는 측정 시각이 필요합니다'; end if;
   perform (r->>'measured_at')::timestamptz;
  end if;
  foreach k in array array['voltage_mv','resistance_mohm','capacity_mah'] loop
   if not(r ? k) then raise exception '측정 키 누락'; end if;
   if r->>k is not null then
    if jsonb_typeof(r->k)<>'number' then raise exception '측정값은 숫자여야 합니다'; end if;
    measured_value:=(r->>k)::numeric; scale:=case when k='resistance_mohm' then 100000 else 1000 end;
    if measured_value<=0 or measured_value>=(case k when 'voltage_mv' then 10000 when 'resistance_mohm' then 1000 else 1000000 end) or measured_value*scale<>trunc(measured_value*scale) then raise exception '측정값·단위·정밀도 오류'; end if;
   end if;
  end loop;
 end loop;
end $$;
