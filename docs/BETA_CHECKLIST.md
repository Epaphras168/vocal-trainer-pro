# Beta checklist

Everything the code can do for you is already in the repo and tested (headers, error screen, crash reporting hook, account deletion, blocking, rate limits, CI, browser tests). This file is **what only you can do**: dashboards, accounts, devices and people. Work top to bottom; the first section blocks everything else.

Tick things off as you go. "Check" means: confirm the setting in the dashboard, because defaults and plan limits change.

---

## 1. Before you invite anyone (blockers)

### 1.1 Separate staging and production
- [ ] Create **two Supabase projects**: `belto-staging` and `belto-prod`.
- [ ] In Vercel, set each variable below **per environment**: *Preview* (and the `staging` branch) points at staging, *Production* at prod. Never share keys between them.
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the anon / publishable key only)
  - `VITE_CONTACT_EMAIL` (a **dedicated** address, not a personal one: it is published on the site)
  - `VITE_GOOGLE_SIGNIN=true` only on prod, and only once Google is published (see 1.5)
  - optional: `VITE_SENTRY_DSN`, `VITE_TURNSTILE_SITE_KEY`
- [ ] **Do not** set `VITE_CLOUD_MOCK` anywhere. A production build refuses to compile with it, but check anyway.
- [ ] Confirm the **service-role key is nowhere in Vercel or the repo**. Only the anon key belongs in the browser.

### 1.2 Apply the database migrations (staging first)
In each project: *SQL Editor*, then run, in this order, the files in `supabase/migrations/`:
1. `20261018000000_friends.sql`
2. `20261108000000_beta_hardening.sql`

Or with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.
- [ ] Staging done and the app works against it (sign up, add a friend, block, delete account).
- [ ] Prod done.
- [ ] Run `npm run test:db` locally against a throwaway Postgres to prove the SQL tests still pass (`PGHOST=localhost PGUSER=postgres PGPASSWORD=... npm run test:db`).

### 1.3 Sign-up email (this one bites first)
Supabase's built-in email sender is heavily rate-limited (a handful per hour). The first ten testers can hit it.
- [ ] Create an account with an email service (Resend, Postmark, SES, ...) and verify your sending domain (SPF, DKIM).
- [ ] Supabase: *Authentication > Emails > SMTP Settings*: turn on custom SMTP and enter it.
- [ ] Set the sender name and address, and check the **confirm-signup** and **reset-password** templates read well.
- [ ] Send yourself a real sign-up and a real reset. Check they don't land in spam.

### 1.4 Auth settings (check each)
- [ ] *Authentication > Sign In / Providers > Email*: **Confirm email** on; **minimum password length 8** (the app asks for 8 on sign-up; the server must agree); leaked-password protection on if your plan has it.
- [ ] *Authentication > URL Configuration*: **Site URL** = your production URL. **Redirect URLs** include: production URL, `https://<prod>/friends`, `https://<prod>/signin?reset=1`, and for staging the preview URL pattern you use. Anything missing makes email links fail.
- [ ] *Authentication > Rate Limits*: look at the defaults and tighten sign-in and email limits if you can.
- [ ] Optional but recommended: **CAPTCHA** (see 2.1).

### 1.5 Google sign-in
- [ ] Google Cloud Console: OAuth consent screen is **In production** (not Testing), with the app name, logo, home page, privacy and terms links, and authorized domains filled in. Verification can take days.
- [ ] Authorized redirect URI is your Supabase project's `.../auth/v1/callback`.
- [ ] Only then set `VITE_GOOGLE_SIGNIN=true` on prod. Test with an account that is **not** yours and **not** a test user.

### 1.6 Vercel
- [ ] Production domain attached, HTTPS working, and the `www` redirect decided.
- [ ] After the first deploy, check headers: `curl -sI https://<your-domain>/privacy`. You should see `content-security-policy`, `strict-transport-security`, `permissions-policy`, `x-content-type-options`.
- [ ] Open the site with browser dev tools and confirm **no red Content-Security-Policy errors** on: landing, a lesson, Friends, sign-in. (The CI browser tests already check this for the production build; this checks your real domain, including any Supabase custom domain. If you use a custom Supabase domain, add it to `connect-src` in `vercel.json`.)
- [ ] Know where **Instant Rollback** is (Deployments > the previous good deployment > Promote).

### 1.7 Backups (check)
- [ ] Decide: Supabase free projects have no automatic backups and can pause when idle; paid plans add daily backups. For a beta with real people's progress, paid is worth it.
- [ ] Do **one restore drill** into a scratch project so you know it works.

---

## 2. First week of the beta

### 2.1 Optional protections (turn on when you have the keys)
- [ ] **Turnstile CAPTCHA**: Cloudflare dashboard > Turnstile > add site (your domain) > copy site key and secret. Site key to Vercel `VITE_TURNSTILE_SITE_KEY`; secret to Supabase *Authentication > Attack Protection > CAPTCHA* (provider Turnstile). **Turn it on in both places or sign-up will break.** Redeploy, then test sign-up, sign-in and reset.
- [ ] **Crash reporting**: create a Sentry project (type: Browser JavaScript), copy the DSN to `VITE_SENTRY_DSN`, redeploy, then trigger a test error. Alerts: email you on new issues. The Privacy page updates itself when the DSN is set.

### 2.2 Verify security by hand against the real project
Row-level security and the account functions are covered by 59 SQL checks, but confirm on your actual project with the anon key (replace the two values; they're in *Project Settings > API*):

```bash
URL=https://<ref>.supabase.co; KEY=<anon key>
# Signed out, none of these should return data (expect [] or a permission error):
curl -s "$URL/rest/v1/profiles?select=*" -H "apikey: $KEY"
curl -s "$URL/rest/v1/progress?select=*" -H "apikey: $KEY"
curl -s "$URL/rest/v1/friendships?select=*" -H "apikey: $KEY"
curl -s "$URL/rest/v1/blocks?select=*" -H "apikey: $KEY"
curl -s "$URL/rest/v1/reports?select=*" -H "apikey: $KEY"
curl -s -X POST "$URL/rest/v1/rpc/friend_board" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"p_week":""}'
curl -s -X POST "$URL/rest/v1/rpc/delete_my_account" -H "apikey: $KEY"
```
- [ ] Repeat the `profiles` and `progress` calls while signed in as test user A and confirm **you only get your own row**, never user B's.
- [ ] Try to send an oversized progress save and confirm it is refused (the database limit is 256 KB).

### 2.3 Reports and abuse
Reports are readable only by you, in the dashboard (*SQL Editor* or *Table editor > reports*):
```sql
select r.created_at, r.reported_name, r.reason, r.reported
from public.reports r order by r.created_at desc limit 50;
```
- [ ] Decide who checks reports and how often (daily during the beta).
- [ ] To remove an abusive account: `delete from auth.users where id = '<reported id>';` (cascades to profile, progress and friendships).
- [ ] If names need a word filter, add banned words to `public.clean_display_name()` in a new migration.

### 2.4 Real devices (the code can't do this)
Test at least:
- [ ] iPhone, Safari (and added to the home screen)
- [ ] Android phone, Chrome (ideally an older, cheaper one)
- [ ] Laptop: Chrome, Safari or Firefox
- [ ] With **wired headphones**, **Bluetooth headphones** and the **phone speaker**
- [ ] Open the link **inside Instagram or WhatsApp**: you should see the "Open in your browser" screen.
- [ ] Deny the mic once and follow the on-screen steps back to a working state.
- [ ] iPhone **silent switch** on: do demo notes play? (Web Audio can be muted by it.)
- [ ] A 20-minute session on a phone: does it slow down, heat up, or drain the battery?
- [ ] Rotate the phone, use a 320 px-wide screen, increase text size.
- [ ] Every flow: onboarding, a lesson of each new type (swell, ad-lib, harmony), a quiz, sign-up by email, Google, password reset, add a friend by code and by invite link, block, delete account.

### 2.5 People
- [ ] **A vocal coach reads the lessons**, especially Power & belting, Registers & bridges and Range, for safety and accuracy. Lesson text is in `src/content/core.ts` and `src/content/expansion.ts`; `docs/CURRICULUM.md` explains the reasoning and the weak evidence.
- [ ] **Someone reads the Privacy Policy and Terms** (`src/pages/Legal.tsx`). They are plain-language drafts, not legal advice. If testers are in the EU/UK, or may be under 18, get proper advice.
- [ ] Decide the **minimum age** wording you want and whether to ask for it at onboarding. The policy currently says not for under 13s.
- [ ] Put the contents of `docs/KNOWN_LIMITS.md` in the invite message, or link to it.

---

## 3. Running the beta

### 3.1 Waves
1. **Wave 1: 10 to 20 people you know.** Watch every session if you can. Fix what repeats.
2. **Wave 2: about 50.** Once the top issues are fixed and sign-up email is solid.
3. **Wave 3: open invite.** Only when crashes are rare and you've handled a few reports.

### 3.2 Exit criteria for each wave (suggested)
- No unexplained errors in Sentry for 3 days
- 8 in 10 testers finish their first lesson in 10 minutes
- Mic works for 9 in 10 on their first try (the rest get a clear fix)
- Sign-up emails arrive within a minute for everyone
- No open security or data-loss issue

### 3.3 What to watch
- Vercel: deploy logs, and the build id in the footer (Profile page) matches what testers report.
- Supabase: *Logs* for auth errors and database errors; *Reports* for database size and usage against your plan.
- Sentry: new issues, grouped by lesson/page.
- GitHub issues (bug report and feedback forms are set up).

### 3.4 If something goes wrong
- **Bad deploy:** Vercel > Deployments > promote the last good one. Takes seconds.
- **Bad migration:** restore from backup into a scratch project first; don't edit prod blind.
- **Abuse:** block the account (2.3) and, if needed, tighten Supabase rate limits.
- **Data request:** the app has *Download my data* and *Delete my account*; for anything else, email the contact address and use the SQL in 2.3.

---

## 4. Later (not blockers)
- Offline support (service worker) so the installed app opens without a connection.
- Privacy-friendly product analytics (and update the Privacy Policy when you add it).
- Server-checked leaderboard (today each app reports its own XP).
- Word filter for display names; a moderation view for reports.
- Real-device lab or a service for the iOS/Android matrix.
