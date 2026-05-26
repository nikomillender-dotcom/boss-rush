# Boss Rush — pre-launch security checklist

What's already in code (after the security pass):

- Rate limits on every API route via Upstash Redis (`api/_lib/ratelimit.js`)
- Save payload size cap (64 KB) and key allow-list on `/api/sync-save`
- Event payload size cap + event-name allow-list on `/api/event`
- Origin allow-list on the two unauthenticated endpoints (`/api/event`, `/api/validate-key`, `/api/check-license`)
- Security headers in `vercel.json` (HSTS, nosniff, frame-deny, referrer policy, permissions policy)
- `.gitignore` blocks every `.env*` variant except `.env.example`

What you still have to do outside the codebase, in order.

## 1. Provision Upstash (rate limits will fail-open until you do)

The rate-limit helper fails open when `KV_REST_API_URL` / `KV_REST_API_TOKEN` are unset. That lets local dev work but means **production has no rate limits until Upstash is connected**.

Fastest path: Vercel dashboard → Storage → Marketplace → Upstash for Redis → Connect to the `boss-rush` project. Vercel will auto-inject `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, both names are supported) into all environments.

Free tier (`10,000 commands/day`) is more than enough for launch traffic.

## 2. Supabase dashboard checks

Open the Supabase project, then:

### a. Row Level Security on `profiles`

Database → Tables → `profiles` → RLS. Confirm RLS is **enabled** and policies exist that restrict to `auth.uid() = id`. The API uses the service role key (which bypasses RLS), but RLS is the second line of defense if the anon key ever leaks.

Suggested minimum policies:

```sql
alter table profiles enable row level security;

create policy "users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "users update own profile"
  on profiles for update
  using (auth.uid() = id);
```

Inserts and `purchased = true` writes should only happen via the Stripe webhook (service role), not from the client.

### b. Auth settings

Authentication → Providers → Email:

- Enable email confirmations: **on**
- Minimum password length: **8** or higher
- Optional: enable Magic Link as a password-free fallback. Avoids needing a custom "forgot password" UI for the small number of users who buy via Stripe.

Authentication → Rate Limits: keep defaults (Supabase already throttles `signInWithPassword` / `signUp` per IP).

### c. Confirm site URL

Authentication → URL Configuration → Site URL should be `https://boss-rush-six.vercel.app` (and `https://bossrush.gg` once that domain is wired up). Redirect URLs should include localhost for dev.

## 3. Manual smoke tests after deploy

Run all of these on production once Upstash is connected:

1. Create + delete a test Supabase account via AuthPanel.
2. Try logging in with the wrong password 10+ times in a row. Supabase should start returning 429 / "rate exceeded".
3. POST a bad license key to `/api/validate-key` 6+ times in 10 minutes from the same IP. The 6th request should return `429 rate_limited`.
4. Sign out, clear localStorage, reload prod URL. You should land on the demo paywall, not on the full game.
5. Confirm HTTPS + HSTS:

   ```
   curl -I https://boss-rush-six.vercel.app | grep -i strict-transport
   ```

   Should return `strict-transport-security: max-age=63072000; includeSubDomains; preload`.

6. Confirm anti-clickjacking:

   ```
   curl -I https://boss-rush-six.vercel.app | grep -i x-frame
   ```

   Should return `x-frame-options: DENY`.

## 4. Things deliberately not done

- **No custom forgot-password UI.** Users who buy via Lemon Squeezy get a key in email and don't need a password at all. Supabase Magic Link covers Stripe-path users without code.
- **No strict Content-Security-Policy.** Vite + PWA + inline service worker registration make a strict CSP fiddly. Worth doing later, but the meaningful XSS surface (no `dangerouslySetInnerHTML`, no `eval`, no user-supplied HTML) is already small.
- **No CAPTCHA on signup.** Supabase has hCaptcha built-in if abuse appears post-launch.
- **No server-side game-state validation beyond shape/size.** Only matters if leaderboards ship.
