create function public.sop_v1() returns jsonb language sql immutable set search_path='' as $$ select '{"version":"JSI-SOP-v1","cellCount":8,"limits":{"voltage_mv":10,"resistance_mohm":0.01,"capacity_mah":500}}'::jsonb $$;
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
  if dv>(public.sop_v1()->'limits'->>'voltage_mv')::numeric or dr>(public.sop_v1()->'limits'->>'resistance_mohm')::numeric or dc>(public.sop_v1()->'limits'->>'capacity_mah')::numeric then raise exception 'SOP 허용 편차를 초과했습니다'; end if;
  insert into public.packs(serial_no) values(trim(serial)) returning id into pack_uuid;
  insert into public.pack_cells(pack_id,cell_id,position) select pack_uuid,x,ord::smallint from unnest(cell_ids) with ordinality t(x,ord);
  update public.cells set status='used' where id=any(cell_ids);
  insert into public.audit_logs(action,details) values('pack_approved',jsonb_build_object('pack_id',pack_uuid,'cell_ids',cell_ids,'sop','JSI-SOP-v1','voltage_spread',dv,'resistance_spread',dr,'capacity_spread',dc));
  return pack_uuid;
end $$;
