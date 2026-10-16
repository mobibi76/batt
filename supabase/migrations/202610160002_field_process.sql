-- New packs use the meeting's field process. Existing packs and submissions stay legacy.
alter table public.packs add column process_version text not null default 'legacy' check(process_version in ('legacy','field-v1'));
alter table public.packs alter column process_version set default 'field-v1';
alter table public.inspections drop constraint inspections_kind_check;
alter table public.inspections add constraint inspections_kind_check check(kind in ('aging','module','casing','final'));
-- Reuse existing job responsibilities without editing account permissions.
create or replace function public.can_confirm_stage(stage text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='operator' and (case stage when 'module' then 'aging' when 'casing' then 'assembly' else stage end)=any(process_stages));
$$;
create or replace function public.record_inspection_legacy(target_pack uuid,test_kind text,test_result text,test_note text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare p public.packs; prior public.inspections; module_test public.inspections; new_id uuid; r record; who text;
begin
 if not public.can_confirm_stage(test_kind) then raise exception '해당 검사 공정 담당 권한이 필요합니다'; end if;
 select * into p from public.packs where id=target_pack for update;
 if not found then raise exception '팩을 찾을 수 없습니다'; end if;
 if p.process_version='field-v1' then
  if test_kind not in ('module','casing','final') then raise exception '새 현장 공정은 모듈·케이싱·최종검사 순서입니다'; end if;
  if test_kind in ('casing','final') then
   select * into module_test from public.inspections where pack_id=target_pack and kind='module' order by created_at desc,id desc limit 1;
   if module_test.id is null or module_test.result<>'pass' then raise exception '모듈 검사 합격을 먼저 기록하세요'; end if;
   if test_kind='final' then
    select * into prior from public.inspections where pack_id=target_pack and kind='casing' order by created_at desc,id desc limit 1;
    if prior.id is null or prior.result<>'pass' or prior.created_at<module_test.created_at then raise exception '최신 모듈 검사 이후 케이싱 완료 확인이 필요합니다'; end if;
   end if;
  end if;
 elsif test_kind not in ('aging','final') then raise exception '기존 팩의 공정 기록은 에이징·최종검사로 보존합니다';
 end if;

 insert into public.inspections(pack_id,kind,result,note,created_at) values(target_pack,test_kind,test_result,test_note,clock_timestamp()) returning id into new_id;
 select coalesce(nullif(display_name,''),'구성원') into who from public.profiles where id=auth.uid();
 for r in update public.quality_requests set status='superseded' where pack_id=target_pack and status in ('pending','approved') returning id loop
  insert into public.quality_events(request_id,actor,actor_name,action,note) values(r.id,auth.uid(),who,'superseded','새 검사 기록으로 재검토가 필요합니다. 검사 ID: '||new_id::text);
 end loop;
 insert into public.audit_logs(action,details) values('inspection_recorded',jsonb_build_object('inspection_id',new_id,'pack_id',target_pack));
 return new_id;
end $$;
create or replace function public.submit_quality_request(request_kind text, target_pack uuid, request_title text, request_message text, twin_layout jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.packs; aging public.inspections; casing_test public.inspections; final_test public.inspections; payload jsonb; new_id uuid; who text; heading text;
begin
 if not public.can_operate() then raise exception '작업 권한이 필요합니다'; end if;
 if request_kind is null or request_kind not in ('pack','twin') or coalesce(length(trim(request_message)),0) not between 1 and 2000 then raise exception '대상과 요청 사유를 확인하세요'; end if;
 select coalesce(nullif(display_name,''),'구성원') into who from public.profiles where id=auth.uid();
 if request_kind='pack' then
  select * into p from public.packs where id=target_pack for update;
  if not found then raise exception '팩을 찾을 수 없습니다'; end if;
  if (select count(*) from public.pack_cells where pack_id=target_pack)<>8 then raise exception '구성 셀 8개가 필요합니다'; end if;
  select * into aging from public.inspections where pack_id=target_pack and kind=case when p.process_version='field-v1' then 'module' else 'aging' end order by created_at desc,id desc limit 1;
  select * into final_test from public.inspections where pack_id=target_pack and kind='final' order by created_at desc,id desc limit 1;
  if aging.id is null or final_test.id is null then raise exception '해당 팩의 모듈 또는 기존 에이징 검사와 최종검사를 먼저 등록하세요'; end if;
  if p.process_version='field-v1' then
   select * into casing_test from public.inspections where pack_id=target_pack and kind='casing' order by created_at desc,id desc limit 1;
   if casing_test.id is null or casing_test.created_at<aging.created_at or final_test.created_at<casing_test.created_at then raise exception '모듈 검사 이후 케이싱·최종검사를 순서대로 기록하세요'; end if;
  end if;
  if exists(select 1 from public.quality_requests where pack_id=target_pack and status in ('pending','approved')) then raise exception '이미 대기 중이거나 현재 검사본이 승인되었습니다'; end if;
  payload:=jsonb_build_object('pack',to_jsonb(p),'cells',(select jsonb_agg(to_jsonb(c) order by pc.position) from public.pack_cells pc join public.cells c on c.id=pc.cell_id where pc.pack_id=target_pack),'aging',to_jsonb(aging),'final',to_jsonb(final_test));
  if p.process_version='field-v1' then payload:=payload||jsonb_build_object('casing',to_jsonb(casing_test)); end if;
  heading:=p.serial_no||' 품질 검토';
 else
  if target_pack is not null or coalesce(length(trim(request_title)),0) not between 1 and 120 then raise exception '공정 이름을 입력하세요'; end if;
  payload:=public.validate_twin_submission(twin_layout);heading:=trim(request_title);
  -- Serialize identical personal submissions without imposing collaborative editing.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  if exists(select 1 from public.quality_requests where kind='twin' and submitted_by=auth.uid() and status in ('pending','approved') and snapshot=payload) then raise exception '동일한 공정이 이미 대기 중이거나 승인되었습니다'; end if;
 end if;
 insert into public.quality_requests(kind,pack_id,title,snapshot,request_note,submitted_by,submitted_name) values(request_kind,target_pack,heading,payload,trim(request_message),auth.uid(),who) returning id into new_id;
 insert into public.quality_events(request_id,actor,actor_name,action,note) values(new_id,auth.uid(),who,'submitted',trim(request_message));
 return new_id;
end $$;
create or replace function public.decide_quality_request(request_id uuid, decision text, review_note text) returns void language plpgsql security definer set search_path='' as $$
declare r public.quality_requests; who text; locked_pack uuid; a uuid; f uuid; c uuid;
begin
 if not public.can_review_quality() then raise exception '품질 승인 권한이 필요합니다'; end if;
 if decision is null or decision not in ('approved','rejected') or coalesce(length(trim(review_note)),0) not between 1 and 2000 then raise exception '검토 의견을 입력하세요'; end if;
 select pack_id into locked_pack from public.quality_requests where id=request_id;
 if locked_pack is not null then perform 1 from public.packs where id=locked_pack for update; end if;
 select * into r from public.quality_requests where id=request_id for update;
 if not found or r.status<>'pending' then raise exception '이미 처리되었거나 변경된 요청입니다. 목록을 새로고침하세요'; end if;
 if r.submitted_by=auth.uid() then raise exception '자신이 제출한 요청은 다른 승인자가 검토해야 합니다'; end if;
 if r.kind='pack' then
  if auth.uid()::text in (r.snapshot->'pack'->>'created_by',r.snapshot->'aging'->>'created_by',r.snapshot->'casing'->>'created_by',r.snapshot->'final'->>'created_by') then raise exception '본인이 공정 확인한 팩은 다른 품질 승인권자가 검토해야 합니다'; end if;
  select id into a from public.inspections where pack_id=r.pack_id and kind=case when r.snapshot->'pack'->>'process_version'='field-v1' then 'module' else 'aging' end order by created_at desc,id desc limit 1;
  select id into f from public.inspections where pack_id=r.pack_id and kind='final' order by created_at desc,id desc limit 1;
  if a::text is distinct from r.snapshot->'aging'->>'id' or f::text is distinct from r.snapshot->'final'->>'id' then raise exception '검사 기록이 변경되었습니다. 다시 제출하세요'; end if;
  if r.snapshot->'pack'->>'process_version'='field-v1' then
   select id into c from public.inspections where pack_id=r.pack_id and kind='casing' order by created_at desc,id desc limit 1;
   if c is null or c::text is distinct from r.snapshot->'casing'->>'id' then raise exception '케이싱 기록이 변경되었습니다. 다시 제출하세요'; end if;
   if decision='approved' and r.snapshot->'casing'->>'result' is distinct from 'pass' then raise exception '케이싱 완료 확인이 필요합니다'; end if;
  end if;
  if decision='approved' and (r.snapshot->'aging'->>'result'<>'pass' or r.snapshot->'final'->>'result'<>'pass') then raise exception '모든 공정 확인이 합격이어야 품질 승인할 수 있습니다'; end if;
 end if;
 select coalesce(nullif(display_name,''),'승인자') into who from public.profiles where id=auth.uid();
 update public.quality_requests set status=decision,reviewed_by=auth.uid(),reviewed_name=who,reviewed_at=clock_timestamp(),decision_note=trim(review_note) where id=request_id;
 insert into public.quality_events(request_id,actor,actor_name,action,note) values(request_id,auth.uid(),who,decision,trim(review_note));
end $$;
