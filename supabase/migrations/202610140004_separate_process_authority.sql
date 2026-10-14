-- Account administration never implies production confirmation or quality approval.
alter table public.profiles add column process_stages text[] not null default '{}'
 check (process_stages <@ array['assembly','aging','final']::text[] and array_position(process_stages,null) is null);
create function public.can_confirm_stage(stage text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='operator' and stage=any(process_stages));
$$;
create or replace function public.can_operate() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='operator' and cardinality(process_stages)>0);
$$;
create or replace function public.can_review_quality() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='operator' and quality_reviewer);
$$;
create function public.set_process_permissions(target_id uuid, stages text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다'; end if;
 if stages is null or not(stages <@ array['assembly','aging','final']::text[]) or array_position(stages,null) is not null then raise exception '공정 담당 구분을 확인하세요'; end if;
 update public.profiles set process_stages=array(select distinct unnest(stages) order by 1) where id=target_id and role='operator' and status='approved';
 if not found then raise exception '승인된 업무 구성원에게만 공정 담당을 지정할 수 있습니다'; end if;
 insert into public.audit_logs(action,details) values('process_permissions_changed',jsonb_build_object('target_id',target_id,'stages',stages));
end $$;
-- Keep names with the confirmation; subsequent profile changes cannot rewrite evidence.
alter table public.packs add column confirmed_name text not null default '';
alter table public.inspections add column confirmed_name text not null default '';
update public.packs p set confirmed_name=coalesce(nullif(u.display_name,''),'구성원') from public.profiles u where p.created_by=u.id;
update public.inspections i set confirmed_name=coalesce(nullif(u.display_name,''),'구성원') from public.profiles u where i.created_by=u.id;
create function public.stamp_process_confirmation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select coalesce(nullif(display_name,''),'구성원') into new.confirmed_name from public.profiles where id=new.created_by;
 return new;
end $$;
create trigger pack_confirmation_name before insert on public.packs for each row execute function public.stamp_process_confirmation();
create trigger inspection_confirmation_name before insert on public.inspections for each row execute function public.stamp_process_confirmation();

create or replace function public.import_cells(rows jsonb, source text) returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if not public.can_confirm_stage('assembly') then raise exception '셀 등록·매칭 담당 권한이 필요합니다'; end if;
  if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows) not between 1 and 5000 then raise exception '파일당 1~5000개 셀을 등록하세요'; end if;
  insert into public.cells(id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at,source_name)
    select id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at,left(source,200)
    from jsonb_to_recordset(rows) as x(id text,lot text,voltage_mv numeric,resistance_mohm numeric,capacity_mah numeric,measured_at timestamptz);
  get diagnostics n=row_count;
  insert into public.audit_logs(action,details) values('cell_import',jsonb_build_object('count',n,'source',left(source,200)));
  return n;
end $$;
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
  if dv>10 or dr>0.01 or dc>500 then raise exception 'SOP 허용 편차를 초과했습니다'; end if;
  insert into public.packs(serial_no) values(trim(serial)) returning id into pack_uuid;
  insert into public.pack_cells(pack_id,cell_id,position) select pack_uuid,x,ord::smallint from unnest(cell_ids) with ordinality t(x,ord);
  update public.cells set status='used' where id=any(cell_ids);
  insert into public.audit_logs(action,details) values('pack_approved',jsonb_build_object('pack_id',pack_uuid,'cell_ids',cell_ids,'sop','JSI-SOP-v1','voltage_spread',dv,'resistance_spread',dr,'capacity_spread',dc));
  return pack_uuid;
end $$;
create or replace function public.record_inspection(target_pack uuid,test_kind text,test_result text,test_note text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid; r record; who text;
begin
 if not public.can_confirm_stage(test_kind) then raise exception '해당 검사 공정 담당 권한이 필요합니다'; end if;
 perform 1 from public.packs where id=target_pack for update;
 if not found then raise exception '팩을 찾을 수 없습니다'; end if;
 insert into public.inspections(pack_id,kind,result,note) values(target_pack,test_kind,test_result,test_note) returning id into new_id;
 select coalesce(nullif(display_name,''),'구성원') into who from public.profiles where id=auth.uid();
 for r in update public.quality_requests set status='superseded' where pack_id=target_pack and status in ('pending','approved') returning id loop
  insert into public.quality_events(request_id,actor,actor_name,action,note) values(r.id,auth.uid(),who,'superseded','새 검사 기록으로 재검토가 필요합니다. 검사 ID: '||new_id::text);
 end loop;
 insert into public.audit_logs(action,details) values('inspection_recorded',jsonb_build_object('inspection_id',new_id,'pack_id',target_pack));
 return new_id;
end $$;
create or replace function public.decide_quality_request(request_id uuid, decision text, review_note text) returns void language plpgsql security definer set search_path='' as $$
declare r public.quality_requests; who text; locked_pack uuid; a uuid; f uuid;
begin
 if not public.can_review_quality() then raise exception '품질 승인 권한이 필요합니다'; end if;
 if decision is null or decision not in ('approved','rejected') or coalesce(length(trim(review_note)),0) not between 1 and 2000 then raise exception '검토 의견을 입력하세요'; end if;
 select pack_id into locked_pack from public.quality_requests where id=request_id;
 if locked_pack is not null then perform 1 from public.packs where id=locked_pack for update; end if;
 select * into r from public.quality_requests where id=request_id for update;
 if not found or r.status<>'pending' then raise exception '이미 처리되었거나 변경된 요청입니다. 목록을 새로고침하세요'; end if;
 if r.submitted_by=auth.uid() then raise exception '자신이 제출한 요청은 다른 승인자가 검토해야 합니다'; end if;
 if r.kind='pack' then
  if auth.uid()::text in (r.snapshot->'pack'->>'created_by',r.snapshot->'aging'->>'created_by',r.snapshot->'final'->>'created_by') then raise exception '본인이 공정 확인한 팩은 다른 품질 승인권자가 검토해야 합니다'; end if;
  select id into a from public.inspections where pack_id=r.pack_id and kind='aging' order by created_at desc,id desc limit 1;
  select id into f from public.inspections where pack_id=r.pack_id and kind='final' order by created_at desc,id desc limit 1;
  if a::text is distinct from r.snapshot->'aging'->>'id' or f::text is distinct from r.snapshot->'final'->>'id' then raise exception '검사 기록이 변경되었습니다. 다시 제출하세요'; end if;
  if decision='approved' and (r.snapshot->'aging'->>'result'<>'pass' or r.snapshot->'final'->>'result'<>'pass') then raise exception '에이징·최종검사가 모두 합격이어야 품질 승인할 수 있습니다'; end if;
 end if;
 select coalesce(nullif(display_name,''),'승인자') into who from public.profiles where id=auth.uid();
 update public.quality_requests set status=decision,reviewed_by=auth.uid(),reviewed_name=who,reviewed_at=clock_timestamp(),decision_note=trim(review_note) where id=request_id;
 insert into public.quality_events(request_id,actor,actor_name,action,note) values(request_id,auth.uid(),who,decision,trim(review_note));
end $$;
create or replace function public.review_member(target_id uuid, new_status text, new_role text default 'operator') returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception '관리자 권한이 필요합니다'; end if;
  if target_id=auth.uid() then raise exception '자신의 권한은 변경할 수 없습니다'; end if;
  if new_status not in ('approved','rejected','suspended') or new_role not in ('operator','viewer') then raise exception '잘못된 권한 변경'; end if;
  -- Admin creation/removal is deliberately a separate, privileged operation.
  update public.profiles set status=new_status,role=new_role,process_stages=case when new_status='approved' and new_role='operator' then process_stages else '{}' end,quality_reviewer=case when new_status='approved' and new_role='operator' then quality_reviewer else false end where id=target_id and role<>'admin';
  if not found then raise exception '변경할 사용자가 없습니다'; end if;
  insert into public.audit_logs(action,details) values('member_review',jsonb_build_object('target_id',target_id,'status',new_status,'role',new_role));
end $$;
revoke execute on function public.can_confirm_stage(text),public.set_process_permissions(uuid,text[]),public.stamp_process_confirmation() from public,anon,authenticated;
grant execute on function public.can_confirm_stage(text),public.set_process_permissions(uuid,text[]) to authenticated;
-- Existing operator accounts require explicit process assignment; existing explicit reviewer grants remain.
