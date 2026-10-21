-- Explicit privileges for backend QA provisioning, inspection and cleanup.
-- Do not rely on Supabase's pre-2026-10-30 automatic table grants.
-- User writes remain behind the existing RLS policies / SECURITY DEFINER RPCs.
grant select, update on public.profiles to service_role;
grant select, delete on
  public.cells, public.packs, public.pack_cells, public.inspections,
  public.audit_logs, public.quality_requests, public.quality_events,
  public.intake_batches, public.evidence_events, public.matching_runs
to service_role;
-- private_demo_datasets already has explicit service_role privileges.
-- No default privileges are enabled and no anonymous access is added.
