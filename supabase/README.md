# Supabase setup for online play

Online play needs a Supabase project with Realtime (on by default) and two small tables.

1. Create a free project at supabase.com.
2. Open the SQL editor, paste the contents of `schema.sql`, and run it once.
   Running it again is safe: it recreates the policies and function in place.
3. Copy the Project URL and the **publishable** key from Project Settings → API
   into `.env` locally (see `.env.example`) and into the hosting provider's
   build environment variables.

The app ships only the publishable key. Rooms and results are readable and
insertable by anyone with it; deleting a room requires the creator's secret
token, which never leaves their device except inside the `delete_room` call.
