-- Immutable submissions shared by approved members; all writes are authorized RPCs.
alter table public.profiles add column quality_reviewer boolean not null default false;
create function public.can_review_quality() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='approved' and (role='admin' or (role='operator' and quality_reviewer)));
$$;
create function public.set_quality_reviewer(target_id uuid, enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다'; end if;
 if enabled is null then raise exception '권한 값을 확인하세요'; end if;
 update public.profiles set quality_reviewer=enabled where id=target_id and role='operator' and status='approved';
 if not found then raise exception '승인된 작업자에게만 품질 승인 권한을 지정할 수 있습니다'; end if;
 insert into public.audit_logs(action,details) values('quality_reviewer_changed',jsonb_build_object('target_id',target_id,'enabled',enabled));
end $$;
create table public.quality_requests (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('pack','twin')),
 pack_id uuid references public.packs(id),
 title text not null check(length(title) between 1 and 120),
 snapshot jsonb not null,
 request_note text not null check(length(request_note) between 1 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','superseded')),
 submitted_by uuid not null references public.profiles(id),
 submitted_name text not null,
 submitted_at timestamptz not null default clock_timestamp(),
 reviewed_by uuid references public.profiles(id),
 reviewed_name text,
 reviewed_at timestamptz,
 decision_note text,
 check((kind='pack' and pack_id is not null) or (kind='twin' and pack_id is null)),
 check(reviewed_by is null or reviewed_by<>submitted_by)
);
create unique index quality_one_pending_pack on public.quality_requests(pack_id) where status='pending' and kind='pack';
create index quality_requests_time on public.quality_requests(submitted_at desc,id);
create table public.quality_events (
 id bigint generated always as identity primary key,
 request_id uuid not null references public.quality_requests(id),
 actor uuid not null references public.profiles(id),
 actor_name text not null,
 action text not null check(action in ('submitted','approved','rejected','cancelled','superseded')),
 note text not null,
 created_at timestamptz not null default clock_timestamp()
);
create index quality_events_request on public.quality_events(request_id,id);
alter table public.quality_requests enable row level security;
alter table public.quality_events enable row level security;
create policy quality_requests_read on public.quality_requests for select to authenticated using(public.is_member());
create policy quality_events_read on public.quality_events for select to authenticated using(public.is_member());
revoke all on public.quality_requests,public.quality_events from anon,authenticated;
grant select on public.quality_requests,public.quality_events to authenticated;

-- Server-side normalization of the same bounded, linear virtual layout supported by the UI.
create function public.validate_twin_submission(layout jsonb) returns jsonb language plpgsql set search_path='' as $$
declare d jsonb; t jsonb; e jsonb; ids text[]:='{}'; keys text[]; ins text[]:='{}'; outs text[]:='{}';
 devices jsonb:='[]'; tags jsonb; links jsonb:='[]'; cursor_id text; seen text[]; node_id text;
begin
 if layout is null or octet_length(layout::text)>300000 or layout->>'version' is distinct from '1' or layout->>'source' is distinct from 'simulation'
  or jsonb_typeof(layout->'devices') is distinct from 'array' or jsonb_typeof(layout->'links') is distinct from 'array' then raise exception '가상 공정 파일 형식을 확인하세요'; end if;
 if jsonb_array_length(layout->'devices') not between 1 and 30 or jsonb_array_length(layout->'links')>29 then raise exception '장비 수 또는 연결 수를 확인하세요'; end if;
 for d in select value from jsonb_array_elements(layout->'devices') loop
  if coalesce(d->>'kind','') not in ('scanner','meter','bench','welder','cycler','inspection') or coalesce(d->>'id','') !~ '^[A-Za-z0-9_-]{1,60}$' or d->>'id'=any(ids)
   or coalesce(length(trim(d->>'name')),0) not between 1 and 60 or coalesce(length(trim(d->>'model')),0) not between 1 and 120
   or jsonb_typeof(d->'tags') is distinct from 'array' then raise exception '장비 정의를 확인하세요'; end if;
  if jsonb_typeof(d->'x') is distinct from 'number' or jsonb_typeof(d->'z') is distinct from 'number' or jsonb_typeof(d->'rotation') is distinct from 'number' or jsonb_typeof(d->'cycle') is distinct from 'number' then raise exception '좌표·방향·처리시간은 숫자여야 합니다'; end if;
  if (d->>'x')::numeric<>trunc((d->>'x')::numeric) or (d->>'z')::numeric<>trunc((d->>'z')::numeric)
   or abs((d->>'x')::numeric)>10 or abs((d->>'z')::numeric)>10 or (d->>'rotation')::numeric not in (0,90,180,270)
   or (d->>'cycle')::numeric<>trunc((d->>'cycle')::numeric) or (d->>'cycle')::numeric not between 1 and 120 then raise exception '장비 배치 범위를 확인하세요'; end if;
  if exists(select 1 from jsonb_array_elements(devices) p where abs((p->>'x')::numeric-(d->>'x')::numeric)<2 and abs((p->>'z')::numeric-(d->>'z')::numeric)<2) then raise exception '장비가 겹칩니다'; end if;
  if jsonb_array_length(d->'tags') not between 1 and 12 then raise exception '태그는 1~12개입니다'; end if;
  tags:='[]';keys:='{}';
  for t in select value from jsonb_array_elements(d->'tags') loop
   if coalesce(t->>'key','') !~ '^[a-z][a-z0-9_]{0,39}$' or t->>'key'=any(keys) or coalesce(length(trim(t->>'label')),0) not between 1 and 40 or coalesce(length(trim(t->>'unit')),0) not between 1 and 20
    or jsonb_typeof(t->'nominal') is distinct from 'number' or coalesce(jsonb_typeof(t->'high'),'') not in ('number','null') then raise exception '태그 정의를 확인하세요'; end if;
   if abs((t->>'nominal')::numeric)>1000000 or (t->>'high' is not null and abs((t->>'high')::numeric)>1000000) then raise exception '태그 수치 범위를 확인하세요'; end if;
   keys:=array_append(keys,t->>'key');tags:=tags||jsonb_build_array(jsonb_build_object('key',t->>'key','label',t->>'label','unit',t->>'unit','nominal',t->'nominal','high',t->'high'));
  end loop;
  ids:=array_append(ids,d->>'id');devices:=devices||jsonb_build_array(jsonb_build_object('id',d->>'id','kind',d->>'kind','name',d->>'name','model',d->>'model','x',d->'x','z',d->'z','rotation',d->'rotation','cycle',d->'cycle','tags',tags));
 end loop;
 for e in select value from jsonb_array_elements(layout->'links') loop
  if coalesce(e->>'from','')<>all(ids) or coalesce(e->>'to','')<>all(ids) or e->>'from'=e->>'to' or e->>'from'=any(outs) or e->>'to'=any(ins) then raise exception '입력·출력 연결을 확인하세요'; end if;
  outs:=array_append(outs,e->>'from');ins:=array_append(ins,e->>'to');links:=links||jsonb_build_array(jsonb_build_object('from',e->>'from','to',e->>'to'));
 end loop;
 foreach node_id in array ids loop
  cursor_id:=node_id;seen:='{}';
  while cursor_id is not null loop
   if cursor_id=any(seen) then raise exception '순환 공정은 지원하지 않습니다'; end if;
   seen:=array_append(seen,cursor_id);select value->>'to' into cursor_id from jsonb_array_elements(links) where value->>'from'=cursor_id;
  end loop;
 end loop;
 for d in select value from jsonb_array_elements(devices) loop
  if (not(d->>'id'=any(ins)) and d->>'kind'<>'scanner') or (not(d->>'id'=any(outs)) and d->>'kind'<>'inspection') or (d->>'id'=any(ins) and d->>'kind'='scanner') or (d->>'id'=any(outs) and d->>'kind'='inspection') then raise exception '식별 리더에서 최종검사대로 연결된 공정만 제출할 수 있습니다'; end if;
 end loop;
 return jsonb_build_object('version',1,'source','simulation','devices',devices,'links',links);
end $$;

create function public.submit_quality_request(request_kind text, target_pack uuid, request_title text, request_message text, twin_layout jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.packs; aging public.inspections; final_test public.inspections; payload jsonb; new_id uuid; who text; heading text;
begin
 if not public.can_operate() then raise exception '작업 권한이 필요합니다'; end if;
 if request_kind is null or request_kind not in ('pack','twin') or coalesce(length(trim(request_message)),0) not between 1 and 2000 then raise exception '대상과 요청 사유를 확인하세요'; end if;
 select coalesce(nullif(display_name,''),'구성원') into who from public.profiles where id=auth.uid();
 if request_kind='pack' then
  select * into p from public.packs where id=target_pack for update;
  if not found then raise exception '팩을 찾을 수 없습니다'; end if;
  if (select count(*) from public.pack_cells where pack_id=target_pack)<>8 then raise exception '구성 셀 8개가 필요합니다'; end if;
  select * into aging from public.inspections where pack_id=target_pack and kind='aging' order by created_at desc,id desc limit 1;
  select * into final_test from public.inspections where pack_id=target_pack and kind='final' order by created_at desc,id desc limit 1;
  if aging.id is null or final_test.id is null then raise exception '에이징·최종검사 기록을 먼저 등록하세요'; end if;
  if exists(select 1 from public.quality_requests where pack_id=target_pack and status in ('pending','approved')) then raise exception '이미 대기 중이거나 현재 검사본이 승인되었습니다'; end if;
  payload:=jsonb_build_object('pack',to_jsonb(p),'cells',(select jsonb_agg(to_jsonb(c) order by pc.position) from public.pack_cells pc join public.cells c on c.id=pc.cell_id where pc.pack_id=target_pack),'aging',to_jsonb(aging),'final',to_jsonb(final_test));
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

create function public.decide_quality_request(request_id uuid, decision text, review_note text) returns void language plpgsql security definer set search_path='' as $$
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
  select id into a from public.inspections where pack_id=r.pack_id and kind='aging' order by created_at desc,id desc limit 1;
  select id into f from public.inspections where pack_id=r.pack_id and kind='final' order by created_at desc,id desc limit 1;
  if a::text is distinct from r.snapshot->'aging'->>'id' or f::text is distinct from r.snapshot->'final'->>'id' then raise exception '검사 기록이 변경되었습니다. 다시 제출하세요'; end if;
  if decision='approved' and (r.snapshot->'aging'->>'result'<>'pass' or r.snapshot->'final'->>'result'<>'pass') then raise exception '에이징·최종검사가 모두 합격이어야 품질 승인할 수 있습니다'; end if;
 end if;
 select coalesce(nullif(display_name,''),'승인자') into who from public.profiles where id=auth.uid();
 update public.quality_requests set status=decision,reviewed_by=auth.uid(),reviewed_name=who,reviewed_at=clock_timestamp(),decision_note=trim(review_note) where id=request_id;
 insert into public.quality_events(request_id,actor,actor_name,action,note) values(request_id,auth.uid(),who,decision,trim(review_note));
end $$;

create function public.cancel_quality_request(request_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.quality_requests; who text;
begin
 if not public.can_operate() then raise exception '작업 권한이 필요합니다'; end if;
 select * into r from public.quality_requests where id=request_id for update;
 if not found or r.status<>'pending' or r.submitted_by<>auth.uid() then raise exception '본인의 대기 중 요청만 취소할 수 있습니다'; end if;
 select coalesce(nullif(display_name,''),'구성원') into who from public.profiles where id=auth.uid();
 update public.quality_requests set status='cancelled' where id=request_id;
 insert into public.quality_events(request_id,actor,actor_name,action,note) values(request_id,auth.uid(),who,'cancelled','제출자가 요청을 취소했습니다.');
end $$;

-- Pack lock is shared with submission/review. New evidence invalidates the old approval atomically.
create or replace function public.record_inspection(target_pack uuid,test_kind text,test_result text,test_note text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid; r record; who text;
begin
 if not public.can_operate() then raise exception '작업 권한이 필요합니다'; end if;
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
revoke execute on function public.can_review_quality(),public.set_quality_reviewer(uuid,boolean),public.validate_twin_submission(jsonb),public.submit_quality_request(text,uuid,text,text,jsonb),public.decide_quality_request(uuid,text,text),public.cancel_quality_request(uuid) from public,anon,authenticated;
grant execute on function public.can_review_quality(),public.set_quality_reviewer(uuid,boolean),public.submit_quality_request(text,uuid,text,text,jsonb),public.decide_quality_request(uuid,text,text),public.cancel_quality_request(uuid) to authenticated;
