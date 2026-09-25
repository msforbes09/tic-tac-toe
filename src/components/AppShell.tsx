import type { ReactNode } from "react"
import { Backdrop } from "@/components/Backdrop"

// Phone-sized column on every viewport. On wide screens it floats as a card in the room.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="room relative flex min-h-dvh justify-center bg-muted">
      <Backdrop />
      <main
        className="room-card relative bg-background flex min-h-dvh w-full max-w-[420px] min-w-0 flex-col px-4"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>
    </div>
  )
}
