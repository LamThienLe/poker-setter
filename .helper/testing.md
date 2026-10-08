# Poker Settler — Testing before release

Production and local development now point at different Supabase projects, so
you can break things locally without touching real games.

## One-time setup

1. Create a second Supabase project (the free plan allows more than one).
   Name it something like `poker-settler-test`.
2. In that project, open the SQL editor and run the whole of
   `supabase-setup.sql`. It is idempotent, so re-running it later is safe.
   The `alter publication` line may error with "table is already member of
   publication" — that is harmless.
3. In Settings → API, copy the project URL and the `anon` public key.
4. Paste both into `.env.local`, replacing the production values that are in
   there now:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-project-anon-key
   ```

Until you do step 4, local development still writes to production.

`.env.local` is gitignored and never leaves your laptop. Production credentials
live only in the Railway service variables.

## Everyday loop

```bash
npm run dev
```

Open http://localhost:3000. You are now on the test database, so create games,
click Final GG, discard, settle, delete — none of it reaches the real app or
shows up in anyone's stats.

To wipe the test database between sessions, run this in the test project's SQL
editor:

```sql
delete from games;
```

## Testing on your phone

The app is built for phones, so test it on one. `next dev` already serves on
your local network and prints the address:

```
- Network: http://10.5.0.2:3000
```

Open that on your phone over the same wifi. The IP changes between networks, so
read it from the terminal each time. This covers QR codes, the realtime sync
across two devices, and thumb reach — against the test database.

## Before you release

```bash
npm run lint
npx next build
```

`next build` runs the real production build and type-checks everything. One
pre-existing lint error in `app/stats/page.tsx` about `Date.now` during render
is known and unrelated.

If you changed the Rust settlement code, also:

```bash
cd settle-wasm
cargo test
wasm-pack build --release --target bundler \
  --out-dir ../lib/settle_wasm --out-name settle_wasm
rm -f ../lib/settle_wasm/.gitignore
```

See `settle-wasm/README.md` for why that `rm` matters.

To check the production build exactly as Railway will serve it:

```bash
npx next build && npx next start
```

## Releasing

Railway deploys automatically from the `railway` branch, which is also the
default branch.

```bash
git push origin railway
```

`NEXT_PUBLIC_` variables are inlined at build time, not read at runtime, so the
Railway service variables must hold the production Supabase values before the
build runs. If they are missing the build fails loudly with a message naming
them, rather than deploying something broken.

## Rolling back

```bash
git log --oneline -5
git revert <commit> && git push origin railway
```
