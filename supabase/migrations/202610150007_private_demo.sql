-- No customer values in source control or public web assets.
create table public.private_demo_datasets (
 id text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.private_demo_datasets enable row level security;
revoke all on public.private_demo_datasets from public, anon, authenticated;
grant select on public.private_demo_datasets to authenticated;
grant all on public.private_demo_datasets to service_role;
create policy private_demo_approved_read on public.private_demo_datasets
 for select to authenticated using (public.is_member());
