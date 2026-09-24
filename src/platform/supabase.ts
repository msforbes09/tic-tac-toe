import { createClient } from '@supabase/supabase-js'
import type { OpenChannel } from '@/lib/realtime'
import type { SupabaseConfig } from '@/lib/room'
import type { RoomDirectory } from '@/lib/roomDirectory'
import { createSupabaseDirectory, type DirectoryClientLike } from './supabaseDirectory'
import { createSupabaseRealtime, type RealtimeClientLike } from './supabaseRealtime'

export type SupabaseServices = { open: OpenChannel; directory: RoomDirectory }

/** Realtime channels plus the rooms/results tables, over one shared Supabase client. */
export function createSupabaseServices(config: SupabaseConfig): SupabaseServices {
  const client = createClient(config.url, config.anonKey, { auth: { persistSession: false } })
  return {
    open: createSupabaseRealtime(client as unknown as RealtimeClientLike),
    directory: createSupabaseDirectory(client as unknown as DirectoryClientLike),
  }
}
