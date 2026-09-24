import type { OpenChannel } from '@/lib/realtime'
import type { SupabaseConfig } from '@/lib/room'
import type { RoomDirectory } from '@/lib/roomDirectory'

export type SupabaseServices = { open: OpenChannel; directory: RoomDirectory }

/**
 * Realtime channels plus the rooms/results tables over one Supabase client.
 * Placeholder until the adapters land: reports online play as unavailable.
 */
export function createSupabaseServices(_config: SupabaseConfig): SupabaseServices | null {
  return null
}
