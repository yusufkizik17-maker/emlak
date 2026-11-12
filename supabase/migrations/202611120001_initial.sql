begin;
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 120),
 retention_days integer not null default 365 check(retention_days between 30 and 730), created_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check(length(full_name) <= 120), language text not null default 'tr' check(language in ('tr','en')),
 created_at timestamptz not null default now()
);
create table public.memberships (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null check(role in ('owner','admin','member')), created_at timestamptz not null default now(),
 primary key(organization_id,user_id)
);
create index memberships_user_idx on public.memberships(user_id);
create table public.leads (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check(length(name) between 2 and 120), email text not null default '' check(length(email)<=254),
 phone text not null default '' check(length(phone)<=30), status text not null default 'new' check(status in ('new','contacted','qualified','won','lost')),
 location text not null default '' check(length(location)<=160), property_type text not null default '' check(length(property_type)<=80),
 budget text not null default '' check(length(budget)<=100), notes text not null default '' check(length(notes)<=4000),
 created_at timestamptz not null default now(), unique(organization_id,id)
);
create table public.lead_messages (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 lead_id uuid not null, content text not null check(length(content) between 10 and 4000), created_at timestamptz not null default now(),
 foreign key(organization_id,lead_id) references public.leads(organization_id,id) on delete cascade,
 unique(organization_id,id)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 lead_id uuid, title text not null check(length(title) between 2 and 200), due_at timestamptz not null,
 completed boolean not null default false, created_at timestamptz not null default now(),
 foreign key(organization_id,lead_id) references public.leads(organization_id,id) on delete cascade
);
create function public.valid_analysis(a jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; cap integer;
begin
 if a is null or jsonb_typeof(a)<>'object' then return false; end if;
 if not (a ?& array['summary','intent','budget','location','property_type','missing_information','follow_up','reply']) or (select count(*) from jsonb_object_keys(a))<>8 then return false; end if;
 foreach k in array array['summary','intent','follow_up','reply'] loop
 cap := case k when 'summary' then 800 when 'intent' then 400 when 'follow_up' then 200 else 2400 end;
 if jsonb_typeof(a->k)<>'string' or length(a->>k)>cap then return false; end if;
 end loop;
 if length(a->>'reply')<10 or length(a->>'follow_up')<2 then return false; end if;
 foreach k in array array['budget','location','property_type'] loop
 cap := case k when 'budget' then 100 when 'location' then 160 else 80 end;
 if jsonb_typeof(a->k) not in ('string','null') or coalesce(length(a->>k),0)>cap then return false; end if;
 end loop;
 if jsonb_typeof(a->'missing_information')<>'array' then return false; end if;
 if jsonb_array_length(a->'missing_information')>8 then return false; end if;
 if exists(select 1 from jsonb_array_elements(a->'missing_information') v where jsonb_typeof(v)<>'string' or length(v#>>'{}')>120) then return false; end if;
 return true;
end $$;
create table public.ai_suggestions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 lead_id uuid not null, message_id uuid not null, analysis jsonb not null check(public.valid_analysis(analysis)),
 approved_at timestamptz, approved_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 foreign key(organization_id,lead_id) references public.leads(organization_id,id) on delete cascade,
 foreign key(organization_id,message_id) references public.lead_messages(organization_id,id) on delete cascade
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, action text not null, entity_id uuid,
 created_at timestamptz not null default now()
);
-- No messages, names, email addresses, prompts or model output in audit records.
create table public.request_counters (
 user_id uuid not null references auth.users(id) on delete cascade, bucket text not null,
 window_start timestamptz not null, count integer not null default 0, primary key(user_id,bucket,window_start)
);
create table public.ai_runs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, lead_id uuid not null,
 consumed boolean not null default false, created_at timestamptz not null default now()
);
create index ai_runs_usage_idx on public.ai_runs(organization_id,created_at);
do $$ declare t text; begin
 foreach t in array array['leads','lead_messages','tasks','ai_suggestions','audit_logs'] loop
 execute format('create index %I on public.%I(organization_id,created_at desc)', t||'_org_idx',t);
 end loop;
end $$;

create function public.has_role(org uuid, roles text[] default array['owner','admin','member']) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.memberships where organization_id=org and user_id=auth.uid() and role=any(roles));
$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120)); return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,full_name)
select id,left(coalesce(raw_user_meta_data->>'full_name',''),120) from auth.users
on conflict(id) do nothing;

create function public.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb; org uuid; entity uuid;
begin
 row_data := case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 org := case when TG_TABLE_NAME='organizations' then (row_data->>'id')::uuid else (row_data->>'organization_id')::uuid end;
 entity := coalesce((row_data->>'id')::uuid,(row_data->>'user_id')::uuid);
 -- A parent organization deletion cascades its audit rows; do not recreate them.
 if not exists(select 1 from public.organizations where id=org) then
   if TG_OP='DELETE' then return old; end if; return new;
 end if;
 insert into public.audit_logs(organization_id,actor_id,action,entity_id) values(org,auth.uid(),TG_TABLE_NAME||'.'||lower(TG_OP),entity);
 if TG_OP='DELETE' then return old; end if; return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['leads','lead_messages','tasks','ai_suggestions','memberships','organizations'] loop
 execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_change()',t,t);
 end loop;
end $$;

-- Public functions have no implicit PUBLIC execute permissions.
create function public.create_organization(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare org uuid; n integer;
begin
 if auth.uid() is null or length(trim(p_name)) not between 2 and 120 then raise exception 'invalid_request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select count(*) into n from public.memberships where user_id=auth.uid();
 if n>=10 then raise exception 'organization_limit'; end if;
 insert into public.organizations(name) values(trim(p_name)) returning id into org;
 insert into public.memberships(organization_id,user_id,role) values(org,auth.uid(),'owner'); return org;
end $$;
create function public.ensure_workspace() returns uuid language plpgsql security definer set search_path='' as $$
declare org uuid;
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select organization_id into org from public.memberships where user_id=auth.uid() order by created_at limit 1;
 if org is null then org := public.create_organization('My business'); end if;
 return org;
end $$;
create function public.set_member(p_org uuid,p_email text,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare target uuid; existing_role text; caller_role text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,1));
 if not public.has_role(p_org,array['owner','admin']) or p_role not in ('admin','member') then raise exception 'forbidden'; end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email));
 select role into existing_role from public.memberships where organization_id=p_org and user_id=target;
 select role into caller_role from public.memberships where organization_id=p_org and user_id=auth.uid();
 if target is null or existing_role='owner' or (caller_role='admin' and (p_role='admin' or existing_role='admin')) then raise exception 'invalid_member'; end if;
 insert into public.memberships(organization_id,user_id,role) values(p_org,target,p_role)
 on conflict(organization_id,user_id) do update set role=excluded.role;
end $$;
create function public.list_members(p_org uuid) returns table(user_id uuid,role text,full_name text,email text) language plpgsql security definer set search_path='' as $$
begin
 if not public.has_role(p_org) then raise exception 'forbidden'; end if;
 return query select m.user_id,m.role,p.full_name,case when public.has_role(p_org,array['owner','admin']) then u.email::text else null::text end
 from public.memberships m join public.profiles p on p.id=m.user_id join auth.users u on u.id=m.user_id where m.organization_id=p_org;
end $$;
create function public.remove_member(p_org uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,1));
 if not public.has_role(p_org,array['owner','admin']) then raise exception 'forbidden'; end if;
 if exists(select 1 from public.memberships where organization_id=p_org and user_id=p_user and (role='owner' or (role='admin' and not public.has_role(p_org,array['owner'])))) then raise exception 'protected_member'; end if;
 delete from public.memberships where organization_id=p_org and user_id=p_user;
end $$;
create function public.take_rate_limit(p_bucket text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; cap integer;
begin
 if auth.uid() is null then return false; end if;
 cap := case p_bucket when 'write' then 60 when 'read' then 120 when 'ai' then 5 else 0 end;
 if cap=0 then return false; end if;
 insert into public.request_counters(user_id,bucket,window_start,count) values(auth.uid(),p_bucket,date_trunc('minute',now()),1)
 on conflict(user_id,bucket,window_start) do update set count=public.request_counters.count+1 returning count into n;
 return n<=cap;
end $$;
create function public.reserve_ai(p_org uuid,p_lead uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare run uuid;
begin
 if not public.has_role(p_org) then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.leads where organization_id=p_org and id=p_lead) then raise exception 'not_found'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,2));
 if (select count(*) from public.ai_runs where organization_id=p_org and created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')>=100
 or (select count(*) from public.ai_runs where organization_id=p_org and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=20 then raise exception 'ai_quota_exceeded'; end if;
 insert into public.ai_runs(organization_id,user_id,lead_id) values(p_org,auth.uid(),p_lead) returning id into run;
 return run;
end $$;
create function public.store_ai_analysis(p_org uuid,p_run uuid,p_lead uuid,p_message text,p_analysis jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare msg uuid; suggestion uuid;
begin
 if not public.has_role(p_org) then raise exception 'forbidden'; end if;
 update public.ai_runs set consumed=true where id=p_run and organization_id=p_org and user_id=auth.uid() and lead_id=p_lead and not consumed and created_at>now()-interval '2 minutes';
 if not found then raise exception 'invalid_reservation'; end if;
 if not public.valid_analysis(p_analysis) then raise exception 'invalid_analysis'; end if;
 insert into public.lead_messages(organization_id,lead_id,content) values(p_org,p_lead,p_message) returning id into msg;
 insert into public.ai_suggestions(organization_id,lead_id,message_id,analysis) values(p_org,p_lead,msg,p_analysis) returning id into suggestion;
 return suggestion;
end $$;
create function public.approve_suggestion(p_org uuid,p_id uuid,p_reply text,p_create_task boolean) returns void
language plpgsql security definer set search_path='' as $$
declare s public.ai_suggestions;
begin
 if not public.has_role(p_org) or length(trim(p_reply)) not between 10 and 2400 then raise exception 'forbidden'; end if;
 select * into s from public.ai_suggestions where organization_id=p_org and id=p_id for update;
 if s.id is null then raise exception 'not_found'; end if;
 if s.approved_at is not null then return; end if;
 update public.ai_suggestions set analysis=jsonb_set(analysis,'{reply}',to_jsonb(trim(p_reply))), approved_at=now(), approved_by=auth.uid() where id=s.id;
 if p_create_task then insert into public.tasks(organization_id,lead_id,title,due_at) values(p_org,s.lead_id,left(s.analysis->>'follow_up',200),now()+interval '1 day'); end if;
end $$;
create function public.purge_expired(p_org uuid) returns integer language plpgsql security definer set search_path='' as $$
declare days integer; n integer;
begin
 if not public.has_role(p_org,array['owner']) then raise exception 'forbidden'; end if;
 select retention_days into days from public.organizations where id=p_org;
 delete from public.leads where organization_id=p_org and created_at<now()-make_interval(days=>days);
 get diagnostics n=row_count;
 delete from public.tasks where organization_id=p_org and lead_id is null and created_at<now()-make_interval(days=>days);
 delete from public.lead_messages where organization_id=p_org and created_at<now()-make_interval(days=>days);
 delete from public.ai_runs where organization_id=p_org and created_at<now()-interval '62 days';
 delete from public.audit_logs where organization_id=p_org and created_at<now()-interval '365 days';
 delete from public.request_counters where user_id=auth.uid() and window_start<now()-interval '2 days';
 return n;
end $$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.leads enable row level security;
alter table public.lead_messages enable row level security;
alter table public.tasks enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.request_counters enable row level security;
alter table public.ai_runs enable row level security;

create policy org_read on public.organizations for select to authenticated using(public.has_role(id));
create policy org_update on public.organizations for update to authenticated using(public.has_role(id,array['owner','admin'])) with check(public.has_role(id,array['owner','admin']));
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy membership_read on public.memberships for select to authenticated using(public.has_role(organization_id));
do $$ declare t text; begin
 foreach t in array array['leads','tasks'] loop
 execute format('create policy tenant_select on public.%I for select to authenticated using(public.has_role(organization_id))',t);
 execute format('create policy tenant_insert on public.%I for insert to authenticated with check(public.has_role(organization_id))',t);
 execute format('create policy tenant_update on public.%I for update to authenticated using(public.has_role(organization_id)) with check(public.has_role(organization_id))',t);
 execute format('create policy tenant_delete on public.%I for delete to authenticated using(public.has_role(organization_id))',t);
 end loop;
 foreach t in array array['lead_messages','ai_suggestions'] loop
 execute format('create policy tenant_select on public.%I for select to authenticated using(public.has_role(organization_id))',t);
 end loop;
end $$;
create policy audit_read on public.audit_logs for select to authenticated using(public.has_role(organization_id));
-- Privileges narrow the writable columns; organization IDs cannot be moved on update.
revoke all on public.organizations,public.profiles,public.memberships,public.leads,public.tasks,public.lead_messages,public.ai_suggestions,public.audit_logs,public.ai_runs,public.request_counters from anon,authenticated;
grant select on public.organizations,public.profiles,public.memberships,public.leads,public.tasks,public.lead_messages,public.ai_suggestions,public.audit_logs to authenticated;
grant update(name,retention_days) on public.organizations to authenticated;
grant update(full_name,language) on public.profiles to authenticated;
grant insert(organization_id,name,email,phone,status,location,property_type,budget,notes),update(name,email,phone,status,location,property_type,budget,notes),delete on public.leads to authenticated;
grant insert(organization_id,lead_id,title,due_at,completed),update(title,due_at,completed),delete on public.tasks to authenticated;
-- Explicit signatures prevent accidental exposure through default function grants.
revoke all on function public.valid_analysis(jsonb),public.has_role(uuid,text[]),public.handle_new_user(),public.audit_change(),public.create_organization(text),public.ensure_workspace(),public.set_member(uuid,text,text),public.list_members(uuid),public.remove_member(uuid,uuid),public.take_rate_limit(text),public.reserve_ai(uuid,uuid),public.store_ai_analysis(uuid,uuid,uuid,text,jsonb),public.approve_suggestion(uuid,uuid,text,boolean),public.purge_expired(uuid) from public,anon,authenticated;
grant execute on function public.valid_analysis(jsonb),public.has_role(uuid,text[]),public.create_organization(text),public.ensure_workspace(),public.set_member(uuid,text,text),public.list_members(uuid),public.remove_member(uuid,uuid),public.take_rate_limit(text),public.reserve_ai(uuid,uuid),public.store_ai_analysis(uuid,uuid,uuid,text,jsonb),public.approve_suggestion(uuid,uuid,text,boolean),public.purge_expired(uuid) to authenticated;
commit;
