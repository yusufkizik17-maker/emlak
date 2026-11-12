begin;
-- Additive migration: existing customers, messages, tasks and suggestions remain intact.
create table public.properties (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null check(length(title) between 3 and 160), city text not null check(length(city) between 2 and 100),
 district text not null default '' check(length(district)<=100), price numeric not null check(price>0 and price<=1e12),
 currency text not null check(currency in ('TRY','USD','EUR')), rooms text not null default '' check(length(rooms)<=20),
 property_type text not null check(property_type in ('apartment','villa','office','land')),
 listing_type text not null check(listing_type in ('sale','rent')), elevator boolean not null default false,
 floor text not null check(floor in ('middle_floor','ground_floor','top_floor')), active boolean not null default true,
 created_at timestamptz not null default now(), unique(organization_id,id)
);
create function public.valid_copilot(a jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare r jsonb; k text;
begin
 if a is null or jsonb_typeof(a)<>'object' or not (a ?& array['summary','requirements','missing_information','reply','follow_up']) or (select count(*) from jsonb_object_keys(a))<>5 then return false; end if;
 if jsonb_typeof(a->'summary')<>'string' or length(a->>'summary')>800 or jsonb_typeof(a->'reply')<>'string' or length(a->>'reply') not between 10 and 2400 or jsonb_typeof(a->'follow_up')<>'string' or length(a->>'follow_up') not between 2 and 200 then return false; end if;
 if jsonb_typeof(a->'missing_information')<>'array' then return false; end if;
 if jsonb_array_length(a->'missing_information')>8 then return false; end if;
 if exists(select 1 from jsonb_array_elements(a->'missing_information') v where jsonb_typeof(v)<>'string' or length(v#>>'{}')>160) then return false; end if;
 r:=a->'requirements';
 if jsonb_typeof(r)<>'object' or not (r ?& array['intent','city','district','budget_max','currency','rooms','property_type','listing_type','elevator_required','floor_preference']) then return false; end if;
 if (select count(*) from jsonb_object_keys(r))<>10 then return false; end if;
 if r->>'intent' not in ('buy_property','rent_property','sell_property','unknown') or jsonb_typeof(r->'intent')<>'string' then return false; end if;
 foreach k in array array['city','district','rooms'] loop
 if jsonb_typeof(r->k) not in ('string','null') or coalesce(length(r->>k),0)>(case when k='rooms' then 20 else 100 end) then return false; end if;
 end loop;
 if jsonb_typeof(r->'budget_max')<>'null' then
 if jsonb_typeof(r->'budget_max')<>'number' then return false; end if;
 if (r->>'budget_max')::numeric<0 or (r->>'budget_max')::numeric>1e12 then return false; end if;
 end if;
 if jsonb_typeof(r->'elevator_required') not in ('boolean','null') then return false; end if;
 if jsonb_typeof(r->'currency')<>'null' and r->>'currency' not in ('TRY','USD','EUR') then return false; end if;
 if jsonb_typeof(r->'property_type')<>'null' and r->>'property_type' not in ('apartment','villa','office','land') then return false; end if;
 if jsonb_typeof(r->'listing_type')<>'null' and r->>'listing_type' not in ('sale','rent') then return false; end if;
 if jsonb_typeof(r->'floor_preference')<>'null' and r->>'floor_preference' not in ('middle_floor','ground_floor','top_floor') then return false; end if;
 return true;
end $$;
create table public.conversations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 lead_id uuid not null, assignee_id uuid, unread_count integer not null default 0 check(unread_count>=0),
 awaiting_reply boolean not null default false, state text not null default 'open' check(state in ('open','closed')),
 updated_at timestamptz not null default now(), analysis jsonb check(analysis is null or public.valid_copilot(analysis)), created_at timestamptz not null default now(),
 unique(organization_id,id), unique(organization_id,lead_id), unique(organization_id,id,lead_id),
 foreign key(organization_id,lead_id) references public.leads(organization_id,id) on delete cascade,
 foreign key(organization_id,assignee_id) references public.memberships(organization_id,user_id) on delete set null (assignee_id)
);
create index conversations_org_idx on public.conversations(organization_id,updated_at desc);
create index properties_org_idx on public.properties(organization_id,active);
insert into public.conversations(organization_id,lead_id,updated_at) select organization_id,id,created_at from public.leads;
create function public.create_lead_conversation() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.conversations(organization_id,lead_id) values(new.organization_id,new.id); return new; end $$;
create trigger create_conversation after insert on public.leads for each row execute function public.create_lead_conversation();
alter table public.lead_messages add column conversation_id uuid;
alter table public.lead_messages add column direction text not null default 'inbound';
alter table public.lead_messages add column state text not null default 'received';
update public.lead_messages m set conversation_id=c.id from public.conversations c where c.organization_id=m.organization_id and c.lead_id=m.lead_id;
alter table public.lead_messages alter column conversation_id set not null;
alter table public.lead_messages add constraint message_conversation_fk foreign key(organization_id,conversation_id,lead_id) references public.conversations(organization_id,id,lead_id) on delete cascade;
alter table public.lead_messages add constraint message_direction_state check((direction='inbound' and state='received') or (direction='outbound' and state='approved'));
alter table public.lead_messages drop constraint lead_messages_content_check;
alter table public.lead_messages add constraint lead_messages_content_check check(length(content) between 1 and 4000);
update public.conversations c set awaiting_reply=true,unread_count=(select count(*) from public.lead_messages m where m.conversation_id=c.id), updated_at=coalesce((select max(created_at) from public.lead_messages m where m.conversation_id=c.id),c.updated_at) where exists(select 1 from public.lead_messages m where m.conversation_id=c.id);
create function public.link_message_conversation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.conversation_id is null then select id into new.conversation_id from public.conversations where organization_id=new.organization_id and lead_id=new.lead_id; end if;
 return new;
end $$;
create trigger link_message before insert on public.lead_messages for each row execute function public.link_message_conversation();
create function public.touch_conversation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.conversations set updated_at=greatest(updated_at,new.created_at),
 awaiting_reply=new.direction='inbound', unread_count=case when new.direction='inbound' then unread_count+1 else 0 end,
 analysis=case when new.direction='inbound' then null else analysis end,
 state=case when new.direction='inbound' then 'open' else state end
 where id=new.conversation_id and organization_id=new.organization_id;
 return new;
end $$;
create trigger touch_message_conversation after insert on public.lead_messages for each row execute function public.touch_conversation();
create function public.record_approved_reply(p_org uuid,p_conversation uuid,p_content text,p_request uuid) returns void language plpgsql security definer set search_path='' as $$
declare lead uuid; existing public.lead_messages;
begin
 if not public.has_role(p_org) or p_content is null or length(trim(p_content)) not between 1 and 2400 then raise exception 'forbidden'; end if;
 select lead_id into lead from public.conversations where id=p_conversation and organization_id=p_org for update;
 if lead is null then raise exception 'not_found'; end if;
 select * into existing from public.lead_messages where id=p_request;
 if existing.id is not null then
   if existing.organization_id=p_org and existing.conversation_id=p_conversation and existing.content=trim(p_content) and existing.direction='outbound' then return; end if;
   raise exception 'request_conflict';
 end if;
 -- Approved is an internal state. No transport, webhook, or delivered status exists.
 insert into public.lead_messages(id,organization_id,lead_id,conversation_id,content,direction,state) values(p_request,p_org,lead,p_conversation,trim(p_content),'outbound','approved');
end $$;
create function public.save_copilot(p_org uuid,p_conversation uuid,p_run uuid,p_analysis jsonb,p_last_message uuid) returns void language plpgsql security definer set search_path='' as $$
declare lead uuid; latest uuid;
begin
 if not public.has_role(p_org) then raise exception 'forbidden'; end if;
 select lead_id into lead from public.conversations where id=p_conversation and organization_id=p_org for update;
 if lead is null then raise exception 'not_found'; end if;
 select id into latest from public.lead_messages where conversation_id=p_conversation and direction='inbound' order by created_at desc,id desc limit 1;
 if latest is distinct from p_last_message then raise exception 'conversation_changed'; end if;
 if not public.valid_copilot(p_analysis) then raise exception 'invalid_analysis'; end if;
 update public.ai_runs set consumed=true where id=p_run and organization_id=p_org and user_id=auth.uid() and lead_id=lead and not consumed and created_at>now()-interval '2 minutes';
 if not found then raise exception 'invalid_reservation'; end if;
 update public.conversations set analysis=p_analysis where id=p_conversation;
end $$;
alter table public.properties enable row level security;
alter table public.conversations enable row level security;
do $$ declare t text; begin
 foreach t in array array['properties','conversations'] loop
 execute format('create policy tenant_select on public.%I for select to authenticated using(public.has_role(organization_id))',t);
 execute format('create policy tenant_update on public.%I for update to authenticated using(public.has_role(organization_id)) with check(public.has_role(organization_id))',t);
 execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_change()',t,t);
 end loop;
end $$;
create policy tenant_insert on public.properties for insert to authenticated with check(public.has_role(organization_id));
revoke all on public.properties,public.conversations from public,anon,authenticated;
grant select on public.properties,public.conversations to authenticated;
grant insert(organization_id,title,city,district,price,currency,rooms,property_type,listing_type,elevator,floor,active),update(active) on public.properties to authenticated;
grant update(assignee_id,unread_count,state) on public.conversations to authenticated;
revoke all on function public.valid_copilot(jsonb),public.create_lead_conversation(),public.link_message_conversation(),public.touch_conversation(),public.record_approved_reply(uuid,uuid,text,uuid),public.save_copilot(uuid,uuid,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.valid_copilot(jsonb),public.record_approved_reply(uuid,uuid,text,uuid),public.save_copilot(uuid,uuid,uuid,jsonb,uuid) to authenticated;
commit;
