---
paths:
  - "supabase/**"
  - "src/platform/supabase*.ts"
---

# Supabase

- `supabase/schema.sql` is the full schema for a fresh project; every change also gets a dated file in `supabase/migrations/` for existing projects. Keep the two in step.
- Only files matching `src/platform/supabase*.ts` import `@supabase/supabase-js`.
- New tables need RLS; writes that must be owner-only go through an RPC that checks the token (`delete_room`, `upsert_player`, `save_ladder`, `reset_player_data`).
- Never write to `.env`; new config goes in `.env.example` with a note to the user.
