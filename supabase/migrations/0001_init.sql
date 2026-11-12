-- MoveMates MVP schema: profiles, friends, daily stats, challenges.
-- Run this in the Supabase SQL editor (or with `supabase db push`).

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username citext unique not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  emoji text not null default '🏃',
  daily_step_goal int not null default 8000 check (daily_step_goal between 1000 and 100000),
  created_at timestamptz not null default now()
);

create table public.friendships (
  requester uuid not null references public.profiles on delete cascade,
  addressee uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
-- Only one friendship row per pair, whichever direction it was sent.
create unique index friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- One row per user per local calendar day. The phone writes it after reading
-- Apple Health / Health Connect, which already de-duplicate across devices.
create table public.daily_stats (
  user_id uuid not null references public.profiles on delete cascade,
  day date not null,
  steps int not null default 0 check (steps between 0 and 200000),
  active_calories int not null default 0 check (active_calories between 0 and 20000),
  source text,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  -- daily_battle: every day is a round, most days won wins.
  -- weekly_leaderboard: highest total over the whole range wins.
  kind text not null check (kind in ('daily_battle', 'weekly_leaderboard')),
  metric text not null check (metric in ('steps', 'active_calories')),
  title text not null check (char_length(title) between 1 and 60),
  start_date date not null,
  end_date date not null,
  created_by uuid not null default auth.uid() references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 31)
);

create table public.challenge_members (
  challenge_id uuid not null references public.challenges on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index challenge_members_user_idx on public.challenge_members (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies don't recurse).
-- They live in a private schema so they are not callable through the API.
-- ---------------------------------------------------------------------------

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

create or replace function private.is_challenge_member(c uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from challenge_members where challenge_id = c and user_id = u);
$$;

create or replace function private.challenge_creator(c uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select created_by from challenges where id = c;
$$;

create or replace function private.shares_challenge(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from challenge_members m1
    join challenge_members m2 on m1.challenge_id = m2.challenge_id
    where m1.user_id = a and m2.user_id = b
  );
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.daily_stats enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;

-- Profiles are public to signed-in users so friends can find each other by username.
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);
create policy "own profile insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "see own friendships" on public.friendships
  for select to authenticated using (auth.uid() in (requester, addressee));
create policy "send friend request" on public.friendships
  for insert to authenticated with check (requester = auth.uid() and status = 'pending');
create policy "accept friend request" on public.friendships
  for update to authenticated using (addressee = auth.uid()) with check (status = 'accepted');
create policy "remove friendship" on public.friendships
  for delete to authenticated using (auth.uid() in (requester, addressee));

-- Stats: you, your friends, and people in a challenge with you.
create policy "read stats" on public.daily_stats
  for select to authenticated using (
    user_id = auth.uid()
    or private.are_friends(auth.uid(), user_id)
    or private.shares_challenge(auth.uid(), user_id)
  );
create policy "write own stats" on public.daily_stats
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own stats" on public.daily_stats
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read my challenges" on public.challenges
  for select to authenticated using (
    created_by = auth.uid() or private.is_challenge_member(id, auth.uid())
  );
create policy "create challenge" on public.challenges
  for insert to authenticated with check (created_by = auth.uid());
create policy "delete own challenge" on public.challenges
  for delete to authenticated using (created_by = auth.uid());

create policy "read members" on public.challenge_members
  for select to authenticated using (private.is_challenge_member(challenge_id, auth.uid()));
-- The creator adds themselves and any of their friends.
create policy "creator adds members" on public.challenge_members
  for insert to authenticated with check (
    private.challenge_creator(challenge_id) = auth.uid()
    and (user_id = auth.uid() or private.are_friends(auth.uid(), user_id))
  );
create policy "leave or remove" on public.challenge_members
  for delete to authenticated using (
    user_id = auth.uid() or private.challenge_creator(challenge_id) = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Leaderboard: runs as the caller, so RLS above still applies.
-- p_today is the caller's local date; today's round is still in progress
-- and does not count as a win yet.
-- ---------------------------------------------------------------------------

create or replace function public.challenge_leaderboard(p_challenge uuid, p_today date)
returns table (
  user_id uuid,
  username citext,
  display_name text,
  emoji text,
  total bigint,
  today_value bigint,
  days_won bigint
)
language sql stable security invoker set search_path = public as $$
  with ch as (
    select * from challenges where id = p_challenge
  ),
  vals as (
    select m.user_id, s.day,
      case when ch.metric = 'steps' then s.steps else s.active_calories end::bigint as v
    from ch
    join challenge_members m on m.challenge_id = ch.id
    join daily_stats s on s.user_id = m.user_id and s.day between ch.start_date and ch.end_date
  ),
  winners as (
    select x.user_id, count(*) as wins from (
      select v.user_id, v.day, rank() over (partition by v.day order by v.v desc) as r
      from vals v where v.v > 0 and v.day < p_today
    ) x where x.r = 1
    group by x.user_id
  ),
  board as (
    select p.id as user_id, p.username, p.display_name, p.emoji,
      coalesce((select sum(v.v) from vals v where v.user_id = p.id), 0)::bigint as total,
      coalesce((select v.v from vals v where v.user_id = p.id and v.day = p_today), 0)::bigint as today_value,
      coalesce(w.wins, 0)::bigint as days_won,
      ch.kind
    from ch
    join challenge_members m on m.challenge_id = ch.id
    join profiles p on p.id = m.user_id
    left join winners w on w.user_id = p.id
  )
  select b.user_id, b.username, b.display_name, b.emoji, b.total, b.today_value, b.days_won
  from board b
  order by (case when b.kind = 'daily_battle' then b.days_won else 0 end) desc, b.total desc;
$$;

-- ---------------------------------------------------------------------------
-- Realtime: push stat and friendship changes to the app.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.daily_stats;
alter publication supabase_realtime add table public.friendships;
