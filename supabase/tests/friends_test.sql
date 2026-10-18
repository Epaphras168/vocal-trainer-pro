-- Run after auth_stub.sql and the migration. Fails loudly on any wrong result.
\set ON_ERROR_STOP on

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');

create function pg_temp.act_as(u text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u, false);
$$;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', what; end if;
  raise notice 'ok: %', what;
end $$;

set role authenticated;

-- Each user creates their own profile; the database assigns friend codes.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into profiles (id, display_name, xp, level, streak, week_id, week_xp, lessons_completed, best_accuracy, voice_type, last_active)
  values (auth.uid(), 'Ama', 500, 5, 3, '2026-10-12', 120, 6, 91, 'Alto', '2026-10-18');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into profiles (id, display_name, xp, week_id, week_xp) values (auth.uid(), 'Ben', 300, '2026-10-05', 80);
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into profiles (id, display_name, xp) values (auth.uid(), 'Cleo', 900);

select pg_temp.check((select count(*) from profiles) = 1, 'RLS: a user only sees their own profile row');
select pg_temp.check((select friend_code ~ '^[A-HJ-NP-Z2-9]{6}$' from profiles), 'friend code is assigned and well-formed');

-- Cannot write someone else's profile or pick a friend code.
do $$ begin
  begin
    insert into profiles (id, display_name) values ('00000000-0000-0000-0000-00000000000a', 'Hacker');
    raise exception 'FAILED: inserted a profile for another user';
  exception when insufficient_privilege or unique_violation then raise notice 'ok: cannot insert another user''s profile';
  end;
  begin
    update profiles set friend_code = 'AAAAAA';
    raise exception 'FAILED: changed own friend code';
  exception when insufficient_privilege then raise notice 'ok: friend code is read-only';
  end;
  begin
    perform * from friendships;
    raise exception 'FAILED: read friendships directly';
  exception when insufficient_privilege then raise notice 'ok: friendships table is not directly readable';
  end;
end $$;
update profiles set xp = 999 where id = '00000000-0000-0000-0000-00000000000a';
reset role;
select pg_temp.check((select xp from profiles where display_name = 'Ama') = 500, 'cannot update another user''s stats');
set role authenticated;

-- Ama adds Ben by code (lower case, with a stray space).
reset role;
select set_config('test.ben_code', (select friend_code from profiles where display_name = 'Ben'), false);
select set_config('test.ama_code', (select friend_code from profiles where display_name = 'Ama'), false);
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check(add_friend(' ' || lower(current_setting('test.ben_code'))) = 'requested', 'Ama requests Ben by code');
select pg_temp.check(add_friend(current_setting('test.ben_code')) = 'already_requested', 'duplicate request is reported');
select pg_temp.check(add_friend(current_setting('test.ama_code')) = 'self', 'cannot add yourself');
select pg_temp.check(add_friend('ZZZZZZ') = 'not_found', 'unknown code');

-- Pending: Ama sees Ben as outgoing with no stats; Ben sees an incoming request.
select pg_temp.check((select relation = 'outgoing' and xp is null from friend_board('2026-10-12') where display_name = 'Ben'), 'pending friend shows no stats');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select relation from friend_board('2026-10-12') where display_name = 'Ama') = 'incoming', 'Ben sees incoming request');
select respond_friend('00000000-0000-0000-0000-00000000000a', true);

-- Accepted: both see each other's progress; week XP only counts the requested week.
select pg_temp.check((select relation = 'friend' and xp = 500 and week_xp = 120 and voice_type = 'Alto' from friend_board('2026-10-12') where display_name = 'Ama'), 'Ben sees Ama''s progress');
select pg_temp.check((select week_xp from friend_board('2026-10-12') where display_name = 'Ben') = 0, 'stale week XP reads as 0');
select pg_temp.check((select count(*) from friend_board('2026-10-12')) = 2, 'board is self + friends only (no Cleo)');

-- Cleo asks Ama; Ama adding Cleo back accepts instead of duplicating.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check(add_friend(current_setting('test.ama_code')) = 'requested', 'Cleo requests Ama');
reset role;
select set_config('test.cleo_code', (select friend_code from profiles where display_name = 'Cleo'), false);
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check(add_friend(current_setting('test.cleo_code')) = 'accepted', 'adding back accepts the request');
select pg_temp.check((select count(*) from friend_board('2026-10-12') where relation = 'friend') = 2, 'Ama has two friends');

-- Ben declines nothing, Ama unfriends Ben.
select remove_friend('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from friend_board('2026-10-12') where display_name = 'Ben') = 0, 'unfriend removes Ben');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from friend_board('2026-10-12')) = 1, 'Ben no longer sees Ama');

-- Declining a request deletes it.
select pg_temp.check(add_friend(current_setting('test.cleo_code')) = 'requested', 'Ben requests Cleo');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select respond_friend('00000000-0000-0000-0000-00000000000b', false);
select pg_temp.check((select count(*) from friend_board('2026-10-12') where display_name = 'Ben') = 0, 'declined request is gone');

-- Progress blob is private.
insert into progress (user_id, data) values (auth.uid(), '{"xp": 900}');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from progress) = 0, 'cannot read another user''s progress');

-- Signed-out callers get nothing.
reset role;
set role anon;
do $$ begin
  begin
    perform friend_board('2026-10-12');
    raise exception 'FAILED: anon called friend_board';
  exception when insufficient_privilege then raise notice 'ok: anon cannot call friend functions';
  end;
end $$;
reset role;
select 'ALL FRIEND TESTS PASSED' as result;
