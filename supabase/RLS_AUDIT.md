# RLS audit (Phase 4)

All `public` app tables use **RLS enabled** with **owner-scoped** policies on `auth.uid()` (or via `conversations.user_id` for `ai_messages`).

| Table | RLS | Notes |
| --- | --- | --- |
| `profiles` | Yes | select/insert/update own row only. No delete policy (account removal goes through `auth.users` cascade). |
| `goals` | Yes | full CRUD own `user_id`. |
| `transactions` | Yes | full CRUD own `user_id`. |
| `conversations` | Yes | full CRUD own `user_id` (coach threads). |
| `ai_messages` | Yes | select/insert only if parent `conversations.user_id = auth.uid()`. **No update** policy (updates denied). **Delete** via `ai_messages_delete_via_conversation` migration so users can remove messages; deleting a conversation still cascades. Edge `coach-chat` uses service role for Gemini only after JWT checks; inserts from the app use anon + user JWT under RLS. |
| `category_budget_caps` | Yes | full CRUD own `user_id`. |

**Coach tables (`conversations`, `ai_messages`)**: A client cannot attach messages to another user’s conversation because insert/select policies require `conversations.user_id = auth.uid()`. Cross-user reads/writes are blocked at Postgres.

**Service role**: Never ship in the mobile app. Only Edge Functions (e.g. `delete-account`, optional admin tooling) use `SUPABASE_SERVICE_ROLE_KEY` in Supabase secrets.

After schema changes, re-run policies in SQL Editor or apply migrations so staging/production match this repo.
