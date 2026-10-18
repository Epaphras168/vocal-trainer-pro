-- Belto cloud: accounts, synced progress and friends.
--
-- Clients only ever touch their own rows directly. Everything that involves
-- another person (adding friends, answering requests, reading friends'
-- progress) goes through the security-definer functions at the bottom, which
-- check auth.uid() themselves.

-- ---------------------------------------------------------------------------
-- Friend codes: short, unambiguous, unique.

-- Security definer so the uniqueness check sees every profile, not just the caller's.
create or replace function public.new_friend_code() returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Singer' check (char_length(display_name) between 1 and 24),
  friend_code text not null unique,
  avatar_hue int not null default 18 check (avatar_hue between 0 and 359),
  -- Public progress summary, written by the owner's app after each session.
  xp int not null default 0 check (xp >= 0),
  level int not null default 1 check (level >= 1),
  streak int not null default 0 check (streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  week_id text,
  week_xp int not null default 0 check (week_xp >= 0),
  lessons_completed int not null default 0 check (lessons_completed >= 0),
  best_accuracy int not null default 0 check (best_accuracy between 0 and 100),
  voice_type text,
  last_active date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The friend code is assigned by the database, never by the client.
alter table public.profiles alter column friend_code set default public.new_friend_code();

-- Full local-first progress blob, so a singer can pick up on another device.
create table public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.friendships (
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- One row per pair, whichever way round the request went.
create unique index friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index friendships_addressee on public.friendships (addressee);

-- ---------------------------------------------------------------------------
-- Row level security

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.friendships enable row level security;

create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own progress" on public.progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- friendships: no direct access at all; see the functions below.

revoke all on public.profiles, public.progress, public.friendships from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name, avatar_hue, xp, level, streak, longest_streak, week_id, week_xp,
              lessons_completed, best_accuracy, voice_type, last_active, updated_at)
  on public.profiles to authenticated;
grant update (display_name, avatar_hue, xp, level, streak, longest_streak, week_id, week_xp,
              lessons_completed, best_accuracy, voice_type, last_active, updated_at)
  on public.profiles to authenticated;
grant select, insert, update, delete on public.progress to authenticated;

-- ---------------------------------------------------------------------------
-- Friend functions

create or replace function public.add_friend(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  other uuid;
  existing public.friendships;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'no profile'; end if;

  select id into other from profiles where friend_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if other is null then return 'not_found'; end if;
  if other = me then return 'self'; end if;

  select * into existing from friendships
   where (requester = me and addressee = other) or (requester = other and addressee = me);

  if found then
    if existing.status = 'accepted' then return 'already_friends'; end if;
    if existing.requester = me then return 'already_requested'; end if;
    -- They already asked us: adding them back accepts.
    update friendships set status = 'accepted' where requester = other and addressee = me;
    return 'accepted';
  end if;

  if (select count(*) from friendships where requester = me or addressee = me) >= 200 then
    return 'limit';
  end if;

  insert into friendships (requester, addressee) values (me, other);
  return 'requested';
end;
$$;

create or replace function public.respond_friend(p_other uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_accept then
    update friendships set status = 'accepted'
     where requester = p_other and addressee = me and status = 'pending';
  else
    delete from friendships where requester = p_other and addressee = me and status = 'pending';
  end if;
end;
$$;

-- Unfriend, or cancel a request either way.
create or replace function public.remove_friend(p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from friendships
   where (requester = me and addressee = p_other) or (requester = p_other and addressee = me);
end;
$$;

-- Everything the Friends screen needs in one call: you, your friends with
-- their progress, and pending requests (names only).
create or replace function public.friend_board(p_week text)
returns table (
  id uuid,
  display_name text,
  avatar_hue int,
  relation text,
  xp int,
  level int,
  streak int,
  longest_streak int,
  week_xp int,
  lessons_completed int,
  best_accuracy int,
  voice_type text,
  last_active date
)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  return query
  with related as (
    select me as pid, 'self'::text as rel
    union all
    select case when f.requester = me then f.addressee else f.requester end,
           case when f.status = 'accepted' then 'friend'
                when f.requester = me then 'outgoing'
                else 'incoming' end
      from friendships f
     where f.requester = me or f.addressee = me
  )
  select p.id, p.display_name, p.avatar_hue, r.rel,
         case when r.rel in ('self', 'friend') then p.xp end,
         case when r.rel in ('self', 'friend') then p.level end,
         case when r.rel in ('self', 'friend') then p.streak end,
         case when r.rel in ('self', 'friend') then p.longest_streak end,
         case when r.rel in ('self', 'friend') then (case when p.week_id = p_week then p.week_xp else 0 end) end,
         case when r.rel in ('self', 'friend') then p.lessons_completed end,
         case when r.rel in ('self', 'friend') then p.best_accuracy end,
         case when r.rel in ('self', 'friend') then p.voice_type end,
         case when r.rel in ('self', 'friend') then p.last_active end
    from related r
    join profiles p on p.id = r.pid;
end;
$$;

revoke all on function public.add_friend(text), public.respond_friend(uuid, boolean),
  public.remove_friend(uuid), public.friend_board(text), public.new_friend_code() from public, anon;
-- new_friend_code runs as the column default when a singer creates their profile.
grant execute on function public.add_friend(text), public.respond_friend(uuid, boolean),
  public.remove_friend(uuid), public.friend_board(text), public.new_friend_code() to authenticated;
