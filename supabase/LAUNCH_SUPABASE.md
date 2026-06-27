# Production Supabase (Phase 4)

## Separate project

1. Create a **new** Supabase project for production (do not reuse dev keys in the App Store / Play build).
2. Run `supabase/schema.sql` plus all `supabase/migrations/*.sql` in order in the SQL Editor (or `supabase db push` from CI if you use the CLI).
3. Deploy Edge Functions to production: `supabase link --project-ref <prod_ref>` then `supabase functions deploy coach-chat` and `supabase functions deploy delete-account`.
4. Set **secrets** on prod functions: `GEMINI_API_KEY` (coach-chat), etc. `SUPABASE_SERVICE_ROLE_KEY` is injected for Edge Functions; no manual secret required unless you rotate keys.

## App env

Production builds should use **production** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` only. Keep dev values in a separate `.env.local` / EAS env profiles.

## Backups

- In Supabase Dashboard → **Project Settings → Database**: enable **Point-in-Time Recovery (PITR)** on paid plans for continuous backup and restore to a timestamp.
- On Free tier, rely on **daily backups** (retention per plan) and export critical data periodically if needed.
- Document your RPO/RTO and test a restore once before launch.

## Post-launch

- Rotate anon key if it was ever committed or leaked.
- Review **Auth** rate limits and **Database** advisors in the dashboard monthly.
