-- Membership is controlled by database administrators, never signup metadata.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'operator' check (role in ('admin','operator','viewer')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  created_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email,display_name) values(new.id,new.email,left(coalesce(new.raw_user_meta_data->>'display_name',''),80));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create function public.is_member() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and status='approved');
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role='admin');
$$;
create function public.can_operate() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and status='approved' and role in ('admin','operator'));
$$;
create table public.cells (
  id text primary key check (length(id) between 1 and 80),
  lot text not null check (length(lot) between 1 and 80),
  voltage_mv numeric not null check(voltage_mv > 0 and voltage_mv < 10000),
  resistance_mohm numeric not null check(resistance_mohm > 0 and resistance_mohm < 1000),
  capacity_mah numeric not null check(capacity_mah > 0 and capacity_mah < 1000000),
  measured_at timestamptz not null,
  status text not null default 'available' check(status in ('available','used','held')),
  source_name text not null default '',
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.packs (
  id uuid primary key default gen_random_uuid(),
  serial_no text not null unique check(length(serial_no) between 1 and 80),
  sop_version text not null default 'JSI-SOP-v1',
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.pack_cells (
  pack_id uuid references public.packs(id),
  cell_id text not null unique references public.cells(id),
  position smallint not null check(position between 1 and 8),
  primary key(pack_id,position)
);
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.packs(id),
  kind text not null check(kind in ('aging','final')),
  result text not null check(result in ('pass','fail')),
  note text not null default '' check(length(note)<=2000),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor uuid not null default auth.uid(),
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.cells enable row level security;
alter table public.packs enable row level security;
alter table public.pack_cells enable row level security;
alter table public.inspections enable row level security;
alter table public.audit_logs enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy cell_read on public.cells for select to authenticated using(public.is_member());
create policy pack_read on public.packs for select to authenticated using(public.is_member());
create policy links_read on public.pack_cells for select to authenticated using(public.is_member());
create policy inspection_read on public.inspections for select to authenticated using(public.is_member());
create policy audit_read on public.audit_logs for select to authenticated using(public.is_admin());
-- All business writes use narrowly scoped RPCs, keeping invariants atomic.
revoke all on public.profiles,public.cells,public.packs,public.pack_cells,public.inspections,public.audit_logs from anon,authenticated;
grant select on public.profiles,public.cells,public.packs,public.pack_cells,public.inspections,public.audit_logs to authenticated;

create function public.review_member(target_id uuid, new_status text, new_role text default 'operator') returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception '관리자 권한이 필요합니다'; end if;
  if target_id=auth.uid() then raise exception '자신의 권한은 변경할 수 없습니다'; end if;
  if new_status not in ('approved','rejected','suspended') or new_role not in ('operator','viewer') then raise exception '잘못된 권한 변경'; end if;
  -- Admin creation/removal is deliberately a separate, privileged operation.
  update public.profiles set status=new_status,role=new_role where id=target_id and role<>'admin';
  if not found then raise exception '변경할 사용자가 없습니다'; end if;
  insert into public.audit_logs(action,details) values('member_review',jsonb_build_object('target_id',target_id,'status',new_status,'role',new_role));
end $$;

create function public.import_cells(rows jsonb, source text) returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if not public.can_operate() then raise exception '작업 권한이 필요합니다'; end if;
  if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows) not between 1 and 5000 then raise exception '파일당 1~5000개 셀을 등록하세요'; end if;
  insert into public.cells(id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at,source_name)
    select id,lot,voltage_mv,resistance_mohm,capacity_mah,measured_at,left(source,200)
    from jsonb_to_recordset(rows) as x(id text,lot text,voltage_mv numeric,resistance_mohm numeric,capacity_mah numeric,measured_at timestamptz);
  get diagnostics n=row_count;
  insert into public.audit_logs(action,details) values('cell_import',jsonb_build_object('count',n,'source',left(source,200)));
  return n;
end $$;

create function public.approve_pack(cell_ids text[], serial text) returns uuid language plpgsql security definer set search_path='' as $$
declare pack_uuid uuid; n integer; dv numeric; dr numeric; dc numeric;
begin
  if not public.can_operate() then raise exception '작업 권한이 필요합니다'; end if;
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

create function public.record_inspection(target_pack uuid, test_kind text, test_result text, test_note text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
  if not public.can_operate() then raise exception '작업 권한이 필요합니다'; end if;
  insert into public.inspections(pack_id,kind,result,note) values(target_pack,test_kind,test_result,test_note) returning id into new_id;
  insert into public.audit_logs(action,details) values('inspection_recorded',jsonb_build_object('inspection_id',new_id,'pack_id',target_pack));
  return new_id;
end $$;

revoke execute on function public.handle_new_user() from public,anon,authenticated;
revoke execute on function public.is_member(), public.is_admin(), public.can_operate(), public.review_member(uuid,text,text), public.import_cells(jsonb,text), public.approve_pack(text[],text), public.record_inspection(uuid,text,text,text) from public,anon;
grant execute on function public.is_member(), public.is_admin(), public.can_operate(), public.review_member(uuid,text,text), public.import_cells(jsonb,text), public.approve_pack(text[],text), public.record_inspection(uuid,text,text,text) to authenticated;
create index cells_status_idx on public.cells(status);
create index inspections_pack_time_idx on public.inspections(pack_id,created_at desc);
