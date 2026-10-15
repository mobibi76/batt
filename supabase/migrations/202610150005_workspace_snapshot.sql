-- One MVCC snapshot for operational records; unchanged polls do not transfer history.
create table public.workspace_revision(id boolean primary key default true check(id),revision bigint not null default 1);
insert into public.workspace_revision default values;
alter table public.workspace_revision enable row level security;
revoke all on public.workspace_revision from public,anon,authenticated;
create function public.bump_workspace_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.workspace_revision set revision=revision+1 where id; return null; end $$;
do $$declare t text;begin
 foreach t in array array['cells','packs','pack_cells','inspections','profiles','quality_requests'] loop
  execute format('create trigger workspace_changed after insert or update or delete on public.%I for each statement execute function public.bump_workspace_revision()',t);
 end loop;
end $$;
create function public.read_workbench(known_revision bigint default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.profiles; v bigint;
begin
 select * into p from public.profiles where id=auth.uid();
 if p.id is null then raise exception '로그인이 필요합니다'; end if;
 if p.status<>'approved' then return jsonb_build_object('profile',to_jsonb(p),'changed',true,'revision',null,'cells','[]'::jsonb,'packs','[]'::jsonb,'tests','[]'::jsonb,'members','[]'::jsonb); end if;
 select revision into v from public.workspace_revision where id;
 if known_revision=v then return jsonb_build_object('profile',to_jsonb(p),'changed',false,'revision',v); end if;
 return jsonb_build_object('profile',to_jsonb(p),'changed',true,'revision',v,
 'cells',coalesce((select jsonb_agg(c order by c.created_at desc,c.id) from public.cells c),'[]'::jsonb),
 'packs',coalesce((select jsonb_agg(to_jsonb(pck)||jsonb_build_object('pack_cells',coalesce((select jsonb_agg(jsonb_build_object('cell_id',pc.cell_id,'position',pc.position) order by pc.position) from public.pack_cells pc where pc.pack_id=pck.id),'[]'::jsonb)) order by pck.created_at desc,pck.id) from public.packs pck),'[]'::jsonb),
 'tests',coalesce((select jsonb_agg(i order by i.created_at desc,i.id) from public.inspections i),'[]'::jsonb),
 'members',case when p.role='admin' then coalesce((select jsonb_agg(m order by m.created_at desc,m.id) from public.profiles m),'[]'::jsonb) else '[]'::jsonb end);
end $$;
revoke all on function public.bump_workspace_revision(),public.read_workbench(bigint) from public,anon,authenticated;
grant execute on function public.read_workbench(bigint) to authenticated;
