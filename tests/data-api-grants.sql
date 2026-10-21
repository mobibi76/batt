-- Run after all migrations, including on a fresh DB without default grants.
do $$
declare t text; p text;
begin
  for t in select tablename from pg_tables where schemaname='public' loop
    if t <> all(array['profiles','cells','packs','pack_cells','inspections',
      'audit_logs','quality_requests','quality_events','intake_batches',
      'evidence_events','matching_runs','research_runs','private_demo_datasets',
      'process_releases','research_literature','workspace_revision']) then
      raise exception 'New public table % needs an explicit grant review and test coverage',t;
    end if;
    if not (select rowsecurity from pg_tables where schemaname='public' and tablename=t) then
      raise exception 'RLS must remain enabled on %',t;
    end if;
  end loop;
  foreach t in array array['profiles','cells','packs','pack_cells','inspections',
    'audit_logs','quality_requests','quality_events','intake_batches',
    'evidence_events','matching_runs','research_runs','private_demo_datasets',
    'process_releases','research_literature'] loop
    if not has_table_privilege('authenticated','public.'||t,'SELECT') then
      raise exception 'Missing authenticated SELECT on %',t;
    end if;
    foreach p in array array['SELECT','INSERT','UPDATE','DELETE'] loop
      if has_table_privilege('anon','public.'||t,p) then
        raise exception 'Unexpected anon % on %',p,t;
      end if;
    end loop;
  end loop;
  foreach t in array array['cells','packs','pack_cells','inspections','audit_logs',
    'quality_requests','quality_events','intake_batches','evidence_events','matching_runs'] loop
    foreach p in array array['SELECT','DELETE'] loop
      if not has_table_privilege('service_role','public.'||t,p) then
        raise exception 'Missing service_role % on %',p,t;
      end if;
    end loop;
    foreach p in array array['INSERT','UPDATE','DELETE'] loop
      if has_table_privilege('authenticated','public.'||t,p) then
        raise exception 'Unexpected authenticated % on %',p,t;
      end if;
    end loop;
  end loop;
  foreach p in array array['SELECT','UPDATE'] loop
    if not has_table_privilege('service_role','public.profiles',p) then
      raise exception 'Missing service_role % on profiles',p;
    end if;
  end loop;
  foreach p in array array['SELECT','INSERT','UPDATE','DELETE'] loop
    if not has_table_privilege('service_role','public.private_demo_datasets',p) then
      raise exception 'Missing service_role % on private_demo_datasets',p;
    end if;
  end loop;
  if has_table_privilege('authenticated','public.workspace_revision','SELECT') then
    raise exception 'Internal workspace_revision must remain private';
  end if;
end $$;
