create function public.valid_research_schema(s jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare f jsonb; keys text[]:=array[]::text[];
begin
 if s is null then return true; end if;
 if jsonb_typeof(s)<>'object' or octet_length(s::text)>65536 then return false; end if;
 if jsonb_typeof(s->'fields') is distinct from 'array' then return false; end if;
 if jsonb_array_length(s->'fields')>60 then return false; end if;
 if jsonb_typeof(s->'version') is distinct from 'string' or jsonb_typeof(s->'dataset_url') is distinct from 'string' or jsonb_typeof(s->'note') is distinct from 'string' then return false; end if;
 if length(s->>'version')>4000 or length(s->>'dataset_url')>4000 or length(s->>'note')>4000 then return false; end if;
 if jsonb_array_length(s->'fields')>0 and length(trim(s->>'version'))=0 then return false; end if;
 if s->>'dataset_url'<>'' and s->>'dataset_url' !~ '^https?://[^[:space:]]+$' then return false; end if;
 for f in select value from jsonb_array_elements(s->'fields') loop
  if jsonb_typeof(f)<>'object' or jsonb_typeof(f->'key') is distinct from 'string' or jsonb_typeof(f->'label') is distinct from 'string' or jsonb_typeof(f->'unit') is distinct from 'string' or jsonb_typeof(f->'required') is distinct from 'boolean' then return false; end if;
  if length(trim(f->>'key')) not between 1 and 120 or trim(f->>'key')<>f->>'key' or (f->>'key')=any(keys) or length(trim(f->>'label')) not between 1 and 300 or length(f->>'unit')>80 then return false; end if;
  if coalesce(f->>'type','') not in ('number','text') or coalesce(f->>'role','') not in ('input','condition','label') then return false; end if;
  keys:=array_append(keys,f->>'key');
 end loop;
 return true;
end $$;
revoke all on function public.valid_research_schema(jsonb) from public,anon;
grant execute on function public.valid_research_schema(jsonb) to authenticated;
alter table public.research_literature add column data_schema jsonb check(public.valid_research_schema(data_schema));
grant update(data_schema) on public.research_literature to authenticated;
