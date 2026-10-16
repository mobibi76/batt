-- Transactional integration tests: no test accounts or data survive ROLLBACK.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111','rls-test-pending@example.invalid','{"role":"admin","status":"approved"}'),
 ('22222222-2222-4222-8222-222222222222','rls-test-operator@example.invalid','{}'),
 ('33333333-3333-4333-8333-333333333333','rls-test-viewer@example.invalid','{}');
update public.profiles set status='approved',process_stages=array['assembly'] where id='22222222-2222-4222-8222-222222222222';
update public.profiles set status='approved',role='viewer' where id='33333333-3333-4333-8333-333333333333';
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  if public.is_member() or public.is_admin() then raise exception 'FAIL: metadata escalation'; end if;
  if (select count(*) from public.cells)<>0 then raise exception 'FAIL: pending user read'; end if;
  begin
    update public.profiles set role='admin' where id=auth.uid();
    raise exception 'FAIL: self privilege escalation';
  exception when insufficient_privilege then null; end;
  begin
    perform public.import_cells_with_source('[]','test','synthetic');
    raise exception 'FAIL: pending user import';
  exception when raise_exception then
    if sqlerrm<>'셀 등록·매칭 담당 권한이 필요합니다' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select public.import_cells_with_source((select jsonb_agg(jsonb_build_object('id','RLS-TEST-'||i,'lot','RLS-TEST','voltage_mv',3300,'resistance_mohm',0.42,'capacity_mah',30000,'measured_at','2026-10-14T00:00:00Z')) from generate_series(1,8) i),'transactional test','synthetic');
reset role;
insert into public.matching_runs(id,batch_revision,created_by,result) values('44444444-4444-4444-8444-444444444444',1,'22222222-2222-4222-8222-222222222222',jsonb_build_object('sop_version','JSI-SOP-v2','input_snapshot',(select jsonb_agg(to_jsonb(c)) from public.cells c where id like 'RLS-TEST-%'),'groups',jsonb_build_array(jsonb_build_object('cell_ids',(select jsonb_agg('RLS-TEST-'||i) from generate_series(1,8) i)))));
set local role authenticated;
select public.approve_recorded_pack(array(select 'RLS-TEST-'||i from generate_series(1,8) i),'RLS-TEST-PACK','44444444-4444-4444-8444-444444444444','test review');
do $$ begin
  if (select count(*) from public.cells where id like 'RLS-TEST-%' and status='used')<>8 then raise exception 'FAIL: pack did not reserve cells'; end if;
  begin
    perform public.approve_recorded_pack(array(select 'RLS-TEST-'||i from generate_series(1,8) i),'RLS-TEST-DUPLICATE','44444444-4444-4444-8444-444444444444','duplicate test');
    raise exception 'FAIL: duplicate approval';
  exception when raise_exception then
    if sqlerrm<>'사용 불가능한 셀이 포함되어 있습니다. 다시 추천받으세요' then raise; end if;
  end;
  begin
    perform public.review_member('11111111-1111-4111-8111-111111111111','approved','operator');
    raise exception 'FAIL: operator approved user';
  exception when raise_exception then if sqlerrm<>'관리자 권한이 필요합니다' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
  if not public.is_member() or public.can_operate() then raise exception 'FAIL: viewer permissions'; end if;
  begin
    perform public.import_cells_with_source('[]','test','synthetic');
    raise exception 'FAIL: viewer import';
  exception when raise_exception then if sqlerrm<>'셀 등록·매칭 담당 권한이 필요합니다' then raise; end if; end;
end $$;
select 'PASS: membership, escalation, import, approval, duplicate prevention, viewer permissions' as result;
rollback;
