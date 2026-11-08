-- Beta hardening: names, progress size, rate limit, blocking, reports, account
-- deletion. Run after auth_stub.sql and the migrations. Self-contained: it
-- makes its own users.
\set ON_ERROR_STOP on

insert into auth.users values
  ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000e2'),
  ('00000000-0000-0000-0000-0000000000f3');

create function pg_temp.act_as(u text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u, false);
$$;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', what; end if;
  raise notice 'ok: %', what;
end $$;
-- The SQLSTATE a statement fails with, or '' if it succeeds.
create function pg_temp.err(q text) returns text language plpgsql as $$
begin
  execute q;
  return '';
exception when others then return sqlstate;
end $$;

set role authenticated;

-- ---- display names -------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
insert into profiles (id, display_name) values (auth.uid(), E'  Dee \t  Dee  ');
select pg_temp.check((select display_name from profiles) = 'Dee Dee', 'names are trimmed and tidied');
select pg_temp.check(pg_temp.err($q$update profiles set display_name = 'visit www.spam.example'$q$) = '23514', 'names with links are rejected');
select pg_temp.check(pg_temp.err($q$update profiles set display_name = 'me@mail.example'$q$) = '23514', 'names with email addresses are rejected');
select pg_temp.check(pg_temp.err($q$update profiles set display_name = 'cheap.xyz'$q$) = '23514', 'names that look like domains are rejected');
select pg_temp.check(pg_temp.err($q$update profiles set display_name = '   '$q$) = '23514', 'blank names are rejected');
select pg_temp.check(pg_temp.err($q$update profiles set display_name = 'Dee'$q$) = '', 'a plain name is fine');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
insert into profiles (id, display_name) values (auth.uid(), 'Eve');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f3');
insert into profiles (id, display_name) values (auth.uid(), 'Fay');

-- ---- saved progress size -------------------------------------------------
select pg_temp.check(pg_temp.err($q$insert into progress (user_id, data) values (auth.uid(), '{"xp": 5}')$q$) = '', 'normal progress saves');
select pg_temp.check(pg_temp.err($q$update progress set data = jsonb_build_object('blob', repeat('x', 300000))$q$) = '23514', 'a 300 KB progress blob is refused');
select pg_temp.check(pg_temp.err($q$update progress set data = '[1,2,3]'$q$) = '23514', 'progress must be a JSON object');

-- ---- blocking ------------------------------------------------------------
reset role;
select set_config('test.dee_code', (select friend_code from profiles where display_name = 'Dee'), false);
select set_config('test.eve_code', (select friend_code from profiles where display_name = 'Eve'), false);
set role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check(add_friend(current_setting('test.eve_code')) = 'requested', 'Dee requests Eve');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select pg_temp.check((select relation from friend_board('2026-10-12') where display_name = 'Dee') = 'incoming', 'Eve sees the request');
select block_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check((select count(*) from friend_board('2026-10-12') where display_name = 'Dee') = 0, 'blocking removes the pending request');
select pg_temp.check((select count(*) from blocked_list() where display_name = 'Dee') = 1, 'blocked list shows Dee');
select pg_temp.check(add_friend(current_setting('test.dee_code')) = 'blocked', 'Eve cannot add someone she blocked');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check(add_friend(current_setting('test.eve_code')) = 'not_found', 'a blocked person just sees "not found"');
select pg_temp.check(pg_temp.err($q$select block_user(auth.uid())$q$) <> '', 'cannot block yourself');
select pg_temp.check(pg_temp.err($q$select * from blocks$q$) = '42501', 'the blocks table is not directly readable');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select unblock_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check((select count(*) from blocked_list()) = 0, 'unblocking empties the list');
select pg_temp.check(add_friend(current_setting('test.dee_code')) = 'requested', 'after unblocking, adding works again');

-- Blocking also ends an accepted friendship.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select respond_friend('00000000-0000-0000-0000-0000000000e2', true);
select pg_temp.check((select count(*) from friend_board('2026-10-12') where relation = 'friend') = 1, 'Dee and Eve are friends');
select block_user('00000000-0000-0000-0000-0000000000e2');
select pg_temp.check((select count(*) from friend_board('2026-10-12') where relation = 'friend') = 0, 'blocking ends the friendship');
select unblock_user('00000000-0000-0000-0000-0000000000e2');

-- ---- reports -------------------------------------------------------------
select pg_temp.check(report_user('00000000-0000-0000-0000-0000000000e2', 'Rude name') = 'reported', 'a report is accepted');
select pg_temp.check(pg_temp.err($q$select * from reports$q$) = '42501', 'reports are not readable by users');
select pg_temp.check(report_user('00000000-0000-0000-0000-0000000000f3', repeat('x', 2000)) = 'reported', 'an over-long reason is trimmed, not rejected');
do $$ begin
  for i in 1..8 loop perform report_user('00000000-0000-0000-0000-0000000000e2', 'again ' || i); end loop;
end $$;
select pg_temp.check(report_user('00000000-0000-0000-0000-0000000000e2', 'one too many') = 'rate_limited', 'the 11th report in a day is refused');
reset role;
select pg_temp.check((select max(char_length(reason)) from reports) <= 500, 'stored reasons are at most 500 characters');
set role authenticated;

-- ---- friend-code guessing is slowed down ----------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f3');
do $$
declare r text;
begin
  for i in 1..30 loop r := add_friend('ZZZZZ' || (i % 10)); end loop;
  if add_friend('ZZZZZZ') <> 'rate_limited' then raise exception 'FAILED: guessing was not rate-limited'; end if;
  raise notice 'ok: the 31st code try in an hour is refused';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select pg_temp.check(add_friend('ZZZZZZ') = 'not_found', 'one person''s tries do not slow another');

-- ---- account deletion -----------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f3');
select delete_my_account();
reset role;
select pg_temp.check((select count(*) from auth.users where id = '00000000-0000-0000-0000-0000000000f3') = 0, 'the sign-in is deleted');
select pg_temp.check((select count(*) from profiles where display_name = 'Fay') = 0, 'the profile is deleted');
select pg_temp.check((select count(*) from progress where user_id = '00000000-0000-0000-0000-0000000000f3') = 0, 'saved progress is deleted');
select pg_temp.check((select count(*) from friend_attempts where user_id = '00000000-0000-0000-0000-0000000000f3') = 0, 'rate-limit rows are deleted');
select pg_temp.check((select count(*) from reports where reported is null and reported_name = 'Fay') = 1, 'a report about the deleted account stays, detached');

set role anon;
select pg_temp.check(pg_temp.err($q$select delete_my_account()$q$) = '42501', 'signed-out callers cannot delete accounts');
select pg_temp.check(pg_temp.err($q$select block_user('00000000-0000-0000-0000-0000000000d1')$q$) = '42501', 'signed-out callers cannot block');
reset role;
select 'ALL BETA TESTS PASSED' as result;
