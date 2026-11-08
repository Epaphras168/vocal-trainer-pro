-- Beta hardening: blocking and reporting, a brake on friend-code guessing,
-- a size limit on saved progress, safer display names, and account deletion.
--
-- As before, clients never touch these tables directly: everything goes
-- through the security-definer functions below, which check auth.uid().

-- ---------------------------------------------------------------------------
-- Tables (no policies and no grants: reachable only through the functions)

create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index blocks_blocked on public.blocks (blocked);

-- Reports are read by the project owner in the dashboard. The report stays
-- (with a snapshot of the name) even if the reported account is deleted.
create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles (id) on delete cascade,
  reported uuid references public.profiles (id) on delete set null,
  reported_name text,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

-- One row per friend-code try, to rate-limit guessing.
create table public.friend_attempts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now()
);
create index friend_attempts_user on public.friend_attempts (user_id, at);

alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.friend_attempts enable row level security;
revoke all on public.blocks, public.reports, public.friend_attempts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Saved progress: must be a JSON object and stay small (256 KB).

alter table public.progress
  add constraint progress_is_small_object check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 262144);

-- ---------------------------------------------------------------------------
-- Display names are shown to strangers on friend requests, so keep links and
-- email addresses (spam, phishing) out, and tidy whitespace.

create or replace function public.clean_display_name() returns trigger
language plpgsql as $$
begin
  new.display_name := btrim(regexp_replace(new.display_name, '[[:cntrl:]\s]+', ' ', 'g'));
  if new.display_name = '' then
    raise exception 'display name is empty' using errcode = 'check_violation';
  end if;
  if new.display_name ~* '(https?:|www\.|@|\.(com|net|org|io|co|me|ly|xyz|ru|cn)\y)' then
    raise exception 'display name may not contain links or email addresses' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_clean_name before insert or update of display_name on public.profiles
  for each row execute function public.clean_display_name();

-- ---------------------------------------------------------------------------
-- add_friend: now rate-limited and block-aware.

create or replace function public.add_friend(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  other uuid;
  existing public.friendships;
  recent int;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'no profile'; end if;

  -- Guessing codes is the only way to find strangers, so allow 30 tries an hour.
  delete from friend_attempts where user_id = me and at < now() - interval '1 day';
  select count(*) into recent from friend_attempts where user_id = me and at > now() - interval '1 hour';
  if recent >= 30 then return 'rate_limited'; end if;
  insert into friend_attempts (user_id) values (me);

  select id into other from profiles where friend_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if other is null then return 'not_found'; end if;
  if other = me then return 'self'; end if;
  -- Someone who blocked you looks exactly like a code that does not exist.
  if exists (select 1 from blocks where blocker = other and blocked = me) then return 'not_found'; end if;
  if exists (select 1 from blocks where blocker = me and blocked = other) then return 'blocked'; end if;

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

-- ---------------------------------------------------------------------------
-- Blocking and reporting

-- Blocking ends any friendship or request and stops either of you adding the other.
create or replace function public.block_user(p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_other is null or p_other = me then raise exception 'cannot block yourself'; end if;
  if not exists (select 1 from profiles where id = p_other) then return; end if;
  delete from friendships
   where (requester = me and addressee = p_other) or (requester = p_other and addressee = me);
  insert into blocks (blocker, blocked) values (me, p_other) on conflict do nothing;
end;
$$;

create or replace function public.unblock_user(p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from blocks where blocker = me and blocked = p_other;
end;
$$;

create or replace function public.blocked_list()
returns table (id uuid, display_name text, avatar_hue int)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  return query
    select p.id, p.display_name, p.avatar_hue
      from blocks b join profiles p on p.id = b.blocked
     where b.blocker = auth.uid()
     order by b.created_at desc;
end;
$$;

-- Returns 'reported' or 'rate_limited' (10 reports a day).
create or replace function public.report_user(p_other uuid, p_reason text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target_name text;
begin
  if me is null then raise exception 'not signed in'; end if;
  if (select count(*) from reports where reporter = me and created_at > now() - interval '1 day') >= 10 then
    return 'rate_limited';
  end if;
  select display_name into target_name from profiles where id = p_other;
  if not found or p_other = me then return 'reported'; end if;
  insert into reports (reporter, reported, reported_name, reason)
    values (me, p_other, target_name, coalesce(nullif(left(btrim(coalesce(p_reason, '')), 500), ''), 'No reason given'));
  return 'reported';
end;
$$;

-- ---------------------------------------------------------------------------
-- Account deletion: removes the sign-in and, by cascade, the profile, saved
-- progress, friendships, blocks and attempts. Reports about the account stay,
-- detached from it.

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.block_user(uuid), public.unblock_user(uuid), public.blocked_list(),
  public.report_user(uuid, text), public.delete_my_account(), public.add_friend(text) from public, anon;
grant execute on function public.block_user(uuid), public.unblock_user(uuid), public.blocked_list(),
  public.report_user(uuid, text), public.delete_my_account(), public.add_friend(text) to authenticated;
