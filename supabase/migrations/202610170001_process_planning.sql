-- An approved planning snapshot becomes the shared process for NEW packs only.
create function public.validate_process_plan(layout jsonb) returns jsonb language plpgsql set search_path='' as $$
declare p jsonb:=layout->'plan'; s jsonb; d jsonb; k text; n numeric; normalized jsonb:='{}';
 route text[]:=array['grading','storage','assembly','module','casing','final']; data_keys text[]:=array['cell_id','pack_id','timestamp','voltage','current','capacity','temperature','resistance','cycle','conditions','outcome','life_label'];
 current_id text; next_id text; stage_index integer; last_index integer:=0; seen text[]:='{}'; stage_seen text[]:='{}'; roots integer;
begin
 if jsonb_typeof(p) is distinct from 'object' or p->>'version' is distinct from '1' or jsonb_typeof(p->'quantity') is distinct from 'number' or jsonb_typeof(p->'stations') is distinct from 'object' or jsonb_typeof(p->'basis') is distinct from 'string' or coalesce(length(trim(p->>'basis')),0) not between 1 and 1000 then raise exception '작업 계획 형식을 확인하세요'; end if;
 n:=(p->>'quantity')::numeric;if n<>trunc(n) or n not between 1 and 10000 then raise exception '목표 수량은 1~10000팩입니다';end if;
 if (select count(*) from jsonb_object_keys(p->'stations'))<>jsonb_array_length(layout->'devices') then raise exception '장비별 작업 계획이 필요합니다';end if;
 for d in select value from jsonb_array_elements(layout->'devices') loop
  s:=p->'stations'->(d->>'id');
  if jsonb_typeof(s) is distinct from 'object' or coalesce(s->>'stage','')<>all(route) or coalesce(s->>'unit','') not in ('cell','pack') or jsonb_typeof(s->'data') is distinct from 'array' then raise exception '공정 단계·확보 데이터 형식을 확인하세요';end if;
  foreach k in array array['minutes','handling','transfer','batch','parallel'] loop
   if jsonb_typeof(s->k) is distinct from 'number' then raise exception '작업 조건은 숫자여야 합니다';end if;
   n:=(s->>k)::numeric;
   if k in ('minutes','handling','transfer') and n not between 0 and 525600 then raise exception '작업시간 범위를 확인하세요';end if;
   if k in ('batch','parallel') and (n<>trunc(n) or n<1 or n>case when k='batch' then 10000 else 100 end) then raise exception '동시 처리 수·병렬 장비 수를 확인하세요';end if;
  end loop;
  if (s->>'minutes')::numeric+(s->>'handling')::numeric<=0 then raise exception '처리시간은 양수여야 합니다';end if;
  if s->>'unit'='cell' and mod((s->>'batch')::numeric,8)<>0 then raise exception '셀 처리 수는 8의 배수입니다';end if;
  if exists(select 1 from jsonb_array_elements(s->'data') v where jsonb_typeof(v) is distinct from 'string' or (v#>>'{}')<>all(data_keys)) or (select count(distinct value) from jsonb_array_elements(s->'data'))<>jsonb_array_length(s->'data') then raise exception '확보 데이터 항목을 확인하세요';end if;
  normalized:=normalized||jsonb_build_object(d->>'id',jsonb_build_object('stage',s->'stage','minutes',s->'minutes','handling',s->'handling','transfer',s->'transfer','batch',s->'batch','parallel',s->'parallel','unit',s->'unit','data',s->'data'));
 end loop;
 select count(*),min(dev.value->>'id') into roots,current_id from jsonb_array_elements(layout->'devices') dev where not exists(select 1 from jsonb_array_elements(layout->'links') e where e->>'to'=dev.value->>'id');
 if roots<>1 then raise exception '운영 공정은 하나의 작업 순서여야 합니다';end if;
 while current_id is not null loop
  if current_id=any(seen) then raise exception '순환 공정입니다';end if;
  seen:=array_append(seen,current_id);s:=normalized->current_id;stage_index:=array_position(route,s->>'stage');
  if stage_index is null or stage_index<last_index then raise exception '운영 공정 순서를 확인하세요';end if;
  last_index:=stage_index;stage_seen:=array_append(stage_seen,s->>'stage');
  select e->>'to' into next_id from jsonb_array_elements(layout->'links') e where e->>'from'=current_id;current_id:=next_id;
 end loop;
 if cardinality(seen)<>jsonb_array_length(layout->'devices') or not(route<@stage_seen) then raise exception '6개 운영 단계를 모두 연결하세요';end if;
 return jsonb_build_object('version',1,'quantity',p->'quantity','basis',trim(p->>'basis'),'stations',normalized);
end $$;

create or replace function public.validate_twin_submission(layout jsonb) returns jsonb language plpgsql set search_path='' as $$
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
 if not(layout ? 'plan') then
 for d in select value from jsonb_array_elements(devices) loop
  if (not(d->>'id'=any(ins)) and d->>'kind'<>'scanner') or (not(d->>'id'=any(outs)) and d->>'kind'<>'inspection') or (d->>'id'=any(ins) and d->>'kind'='scanner') or (d->>'id'=any(outs) and d->>'kind'='inspection') then raise exception '식별 리더에서 최종검사대로 연결된 공정만 제출할 수 있습니다'; end if;
 end loop;
 end if;
 return jsonb_build_object('version',1,'source','simulation','devices',devices,'links',links)||case when layout ? 'plan' then jsonb_build_object('plan',public.validate_process_plan(layout)) else '{}'::jsonb end;
end $$;

create table public.process_releases(
 id uuid primary key references public.quality_requests(id),
 title text not null, layout jsonb not null, approved_at timestamptz not null,
 approved_by uuid not null references public.profiles(id), active boolean not null default true
);
create unique index one_active_process on public.process_releases(active) where active;
alter table public.process_releases enable row level security;
create policy process_release_read on public.process_releases for select to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and status='approved'));
grant select on public.process_releases to authenticated;
revoke all on public.process_releases from anon;

create function public.publish_approved_process() returns trigger language plpgsql security definer set search_path='' as $$
declare normalized jsonb;
begin
 if new.kind='twin' and new.status='approved' and old.status='pending' and new.snapshot ? 'plan' then
  normalized:=public.validate_twin_submission(new.snapshot);
  perform pg_advisory_xact_lock(170017001);
  update public.process_releases set active=false where active;
  insert into public.process_releases(id,title,layout,approved_at,approved_by) values(new.id,new.title,normalized,new.reviewed_at,new.reviewed_by);
 end if;
 return new;
end $$;
create trigger publish_process_after_approval after update on public.quality_requests for each row execute function public.publish_approved_process();

alter table public.packs add column process_design jsonb;
create function public.pin_pack_process() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.process_design is distinct from old.process_design then raise exception '생성 당시 공정 버전은 변경할 수 없습니다';end if;
 else
  perform pg_advisory_xact_lock(170017001);
  select jsonb_build_object('id',id,'title',title,'layout',layout) into new.process_design from public.process_releases where active;
 end if;
 return new;
end $$;
create trigger pin_pack_process before insert or update on public.packs for each row execute function public.pin_pack_process();
revoke all on function public.validate_process_plan(jsonb),public.publish_approved_process(),public.pin_pack_process() from public,anon,authenticated;
