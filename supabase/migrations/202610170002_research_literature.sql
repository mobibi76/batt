-- Bibliographic records only; registration never approves a prediction model.
create table public.research_literature (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null default auth.uid() references public.profiles(id),
 created_at timestamptz not null default now(),
 title text not null check(length(trim(title)) between 1 and 4000),
 url text not null check(length(url) between 1 and 4000 and url ~ '^https?://[^[:space:]]+$'),
 source_key text generated always as (lower(regexp_replace(regexp_replace(url,'^https?://(www\.)?','','i'),'[/#]+$',''))) stored unique,
 authors text not null default '' check(length(authors)<=4000),year text not null default '' check(length(year)<=4000),
 target text not null check(target in ('cell','pack','unknown')),
 topic text not null check(topic in ('life','safety','both')),
 purpose text not null check(length(trim(purpose)) between 1 and 4000),
 inputs text not null default '' check(length(inputs)<=4000),
 conditions text not null default '' check(length(conditions)<=4000),
 evidence text not null default '' check(length(evidence)<=4000),
 status text not null default 'unreviewed' check(status in ('unreviewed','reference','candidate')),
 check(status<>'candidate' or (length(trim(inputs))>0 and length(trim(conditions))>0 and length(trim(evidence))>0))
);
alter table public.research_literature enable row level security;
create policy literature_read on public.research_literature for select to authenticated using(public.is_member());
create policy literature_insert on public.research_literature for insert to authenticated with check(public.can_operate() and created_by=auth.uid());
create policy literature_update on public.research_literature for update to authenticated using(public.can_operate() and created_by=auth.uid()) with check(public.can_operate() and created_by=auth.uid());
create policy literature_delete on public.research_literature for delete to authenticated using(public.can_operate() and created_by=auth.uid());
revoke all on public.research_literature from anon,authenticated;
grant select,insert,delete on public.research_literature to authenticated;
grant update(title,url,authors,year,target,topic,purpose,inputs,conditions,evidence,status) on public.research_literature to authenticated;
