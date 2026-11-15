-- ELFlympics 2026 | Dedicated Supabase project schema
-- Execute in a NEW Supabase project. Never apply this to an unrelated project.
-- The browser must contain only the new project's publishable key, never a secret key.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 3 and 28),
  joined_at timestamptz not null default now()
);
create unique index if not exists profiles_display_name_lower_unique on public.profiles(lower(display_name));

create table if not exists public.events (
  day integer primary key check (day between 1 and 24),
  opens_on date not null,
  game_key text,
  is_published boolean not null default false,
  higher_is_better boolean not null default true,
  constraint assigned_if_published check (not is_published or game_key is not null)
);

insert into public.events(day,opens_on) select i,make_date(2026,12,i) from generate_series(1,24) as i
on conflict (day) do nothing;

create table if not exists public.race_attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  event_day integer not null references public.events(day),
  race_day date not null,
  begun_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'started' check (status in ('started','finished')),
  result numeric,
  constraint finished_has_result check ((status='finished' and result is not null and ended_at is not null) or (status='started' and result is null and ended_at is null)),
  constraint one_official_attempt_per_event_per_uk_day unique(player_id,event_day,race_day)
);
create index if not exists race_attempts_latest on public.race_attempts(player_id,event_day,begun_at desc);

create or replace function public.create_elf_profile()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_name text;
begin
  v_name:=trim(coalesce(new.raw_user_meta_data->>'display_name',''));
  if char_length(v_name)<3 or char_length(v_name)>28 then
    raise exception 'A competitor name of 3 to 28 characters is required';
  end if;
  insert into public.profiles(id,display_name) values(new.id,v_name);
  return new;
end;
$$;
drop trigger if exists on_elf_auth_user_created on auth.users;
create trigger on_elf_auth_user_created after insert on auth.users for each row execute function public.create_elf_profile();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.race_attempts enable row level security;

drop policy if exists "profiles visible to signed in competitors" on public.profiles;
create policy "profiles visible to signed in competitors" on public.profiles for select to authenticated using (true);
drop policy if exists "users edit only their own profile" on public.profiles;
create policy "users edit only their own profile" on public.profiles for update to authenticated
 using ((select auth.uid())=id) with check ((select auth.uid())=id);
drop policy if exists "event schedule public read" on public.events;
create policy "event schedule public read" on public.events for select to anon,authenticated using (true);
drop policy if exists "races readable by competitors for rankings" on public.race_attempts;
create policy "races readable by competitors for rankings" on public.race_attempts for select to authenticated using (true);

revoke all on public.profiles,public.events,public.race_attempts from anon,authenticated;
grant select on public.events to anon,authenticated;
grant select on public.profiles to authenticated;
grant select,update(display_name) on public.profiles to authenticated;
grant select on public.race_attempts to authenticated;

-- Reservations are atomic: a UNIQUE constraint on (player,event,UK-day) prevents
-- extra attempts across devices and even when two requests arrive simultaneously.
create or replace function public.begin_elf_race(p_day integer)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
 v_user uuid := auth.uid();
 v_today date := (now() at time zone 'Europe/London')::date;
 v_event public.events%rowtype;
 v_id uuid;
begin
 if v_user is null then raise exception 'Sign in to start an official race'; end if;
 if v_today < date '2026-12-01' or v_today > date '2026-12-24'
 then raise exception 'Official Elflympics races are open from 1 to 24 December 2026'; end if;
 select * into v_event from public.events where day=p_day;
 if not found or not coalesce(v_event.is_published,false) or v_event.opens_on>v_today
 then raise exception 'This event is not yet available for official racing'; end if;
 begin
  insert into public.race_attempts(player_id,event_day,race_day)
  values(v_user,p_day,v_today) returning id into v_id;
 exception when unique_violation then
  raise exception 'Your official attempt for this event has already been used today';
 end;
 return jsonb_build_object('attempt_id',v_id,'event_day',p_day,'race_day',v_today);
end;
$$;

-- Only the owner of the reserved attempt can submit, and only once.
-- The generic result range/elapsed-time checks are NOT full anti-cheat validation:
-- each event must get game-specific, server-verifiable rules before a public launch.
create or replace function public.complete_elf_race(p_attempt_id uuid,p_score numeric)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
 v_user uuid := auth.uid();
 v_row public.race_attempts%rowtype;
 v_today date := (now() at time zone 'Europe/London')::date;
begin
 if v_user is null then raise exception 'Sign in to submit an official result'; end if;
 if p_score is null or p_score='NaN'::numeric or p_score<0 or p_score>1000000000
 then raise exception 'Invalid result';end if;
 select * into v_row from public.race_attempts
 where id=p_attempt_id and player_id=v_user for update;
 if not found then raise exception 'This is not your race attempt';end if;
 if v_row.status<>'started' then raise exception 'This race has already been submitted';end if;
 if v_today>date '2026-12-24' then raise exception 'The Elflympics is now closed';end if;
 if now()-v_row.begun_at>interval '4 hours'
 then raise exception 'The race session has expired';end if;
 update public.race_attempts set status='finished',result=p_score,ended_at=now() where id=v_row.id;
 return jsonb_build_object('saved',true,'result',p_score,'event_day',v_row.event_day);
end;
$$;
revoke all on function public.begin_elf_race(integer) from public,anon;
revoke all on function public.complete_elf_race(uuid,numeric) from public,anon;
grant execute on function public.begin_elf_race(integer) to authenticated;
grant execute on function public.complete_elf_race(uuid,numeric) to authenticated;

-- The latest attempt, not the best attempt, counts. An unfinished latest run
-- is a DNF and displaces previous completed results.
create or replace view public.event_standings with (security_invoker=true) as
with latest as (
 select distinct on (a.player_id,a.event_day) a.player_id,a.event_day,a.status,a.result,a.begun_at
 from public.race_attempts a
 order by a.player_id,a.event_day,a.begun_at desc,a.id desc
), ranked as (
 select l.event_day as day,l.player_id,p.display_name,l.result,
 rank() over (partition by l.event_day order by
  case when e.higher_is_better then l.result else null end desc nulls last,
  case when not e.higher_is_better then l.result else null end asc nulls last) as position
 from latest l
 join public.events e on e.day=l.event_day
 join public.profiles p on p.id=l.player_id
 where l.status='finished'
)
select day,player_id,display_name,result,position, greatest(1,25-position)::int as event_points
from ranked;

create or replace view public.overall_standings with (security_invoker=true) as
with sums as (
 select p.id as player_id,p.display_name,
  coalesce(sum(e.event_points),0)::integer as total_points,
  count(e.day)::integer as events_finished
 from public.profiles p left join public.event_standings e on e.player_id=p.id
 group by p.id,p.display_name
)
select player_id,display_name,total_points,events_finished,
 rank() over (order by total_points desc) as position
from sums;

grant select on public.event_standings,public.overall_standings to authenticated;
-- Championship scoring V1 is 24 points for 1st, 23 for 2nd, etc., minimum 1.
-- Tied ranks share the same points. Change this formula before 1 Dec if needed.
-- IMPORTANT: Configure a verified custom SMTP sender for email signups.
-- IMPORTANT: Configure Auth redirect URLs and test RLS with two accounts.

-- Privilege hardening following Supabase advisor check
revoke all on function public.create_elf_profile() from public,anon,authenticated;
create index if not exists race_attempts_event_day_idx on public.race_attempts(event_day);
