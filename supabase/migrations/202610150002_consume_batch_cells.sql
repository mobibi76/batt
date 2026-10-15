-- A confirmed pack consumes staged rows too, so later comparisons cannot reuse them.
create function public.consume_evidence_cells() returns trigger language plpgsql security definer set search_path='' as $$
declare b public.intake_batches; oldrow jsonb; newrow jsonb;
begin
 if new.source_batch_id is null or new.status<>'used' or old.status='used' then return new; end if;
 select * into b from public.intake_batches where id=new.source_batch_id for update;
 select value into oldrow from jsonb_array_elements(b.rows) where value->>'id'=new.id;
 newrow:=oldrow||jsonb_build_object('state','used');
 update public.intake_batches set rows=(select jsonb_agg(case when value->>'id'=new.id then newrow else value end order by ord) from jsonb_array_elements(b.rows) with ordinality t(value,ord)),revision=revision+1 where id=b.id;
 insert into public.evidence_events(batch_id,cell_id,action,reason,before_row,after_row) values(b.id,new.id,'packed','팩 구성으로 사용 완료',oldrow,newrow);
 return new;
end $$;
revoke all on function public.consume_evidence_cells() from public,anon,authenticated;
create trigger evidence_cell_consumed after update of status on public.cells for each row execute function public.consume_evidence_cells();
