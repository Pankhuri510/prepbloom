-- Run this entire file in your Supabase project's SQL Editor.
begin;

create table if not exists public.tracker_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('task','weekly','slot','note','syllabus','profile')),
  period text not null default '',
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tracker_entries_owner_period on public.tracker_entries(user_id, kind, period);
create unique index if not exists tracker_singleton_entries on public.tracker_entries(user_id, kind, period)
  where kind in ('syllabus','profile');
alter table public.tracker_entries enable row level security;
drop policy if exists "Own entries only" on public.tracker_entries;
create policy "Own entries only" on public.tracker_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.tracker_entries from anon;
grant select, insert, update, delete on public.tracker_entries to authenticated;

create or replace function public.set_tracker_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists tracker_updated_at on public.tracker_entries;
create trigger tracker_updated_at before update on public.tracker_entries
  for each row execute function public.set_tracker_updated_at();

create table if not exists public.tracker_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('daily','weekly')),
  period text not null,
  stars integer not null check (stars in (1,5)),
  created_at timestamptz not null default now(),
  unique (user_id, kind, period)
);
alter table public.tracker_rewards enable row level security;
drop policy if exists "Read own rewards" on public.tracker_rewards;
create policy "Read own rewards" on public.tracker_rewards for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.tracker_rewards from anon, authenticated;
grant select on public.tracker_rewards to authenticated;

-- Rewards are claimed once per day/week and validated on the server.
create or replace function public.claim_tracker_reward(reward_kind text, reward_period text)
returns void language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); entry_kind text; target_count integer; done_count integer;
  parsed_date date; current_day date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if owner is null then raise exception 'Sign in first'; end if;
  if reward_kind not in ('daily','weekly') then raise exception 'Invalid reward kind'; end if;
  if reward_period !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date'; end if;
  parsed_date := reward_period::date;
  if parsed_date > current_day then return; end if;
  if reward_kind = 'weekly' and extract(isodow from parsed_date) <> 1 then raise exception 'Week must start on Monday'; end if;
  entry_kind := case when reward_kind = 'daily' then 'task' else 'weekly' end;
  select count(*), count(*) filter (where payload->>'done' = 'true') into target_count, done_count
    from public.tracker_entries where user_id = owner and kind = entry_kind and period = reward_period
    and (entry_kind <> 'task' or payload->>'target' = 'true');
  if target_count > 0 and target_count = done_count then
    insert into public.tracker_rewards(user_id, kind, period, stars)
      values(owner, reward_kind, reward_period, case when reward_kind = 'daily' then 1 else 5 end)
      on conflict (user_id, kind, period) do nothing;
  end if;
end;
$$;
revoke all on function public.claim_tracker_reward(text,text) from public, anon;
grant execute on function public.claim_tracker_reward(text,text) to authenticated;

-- Optional real-time updates, with 15-second polling as a fallback.
do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tracker_entries') then
      alter publication supabase_realtime add table public.tracker_entries;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tracker_rewards') then
      alter publication supabase_realtime add table public.tracker_rewards;
    end if;
  end if;
end $$;
commit;
