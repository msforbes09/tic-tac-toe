import type { ReactNode } from 'react'

// Phone-sized column on every viewport. On wide screens it sits centred on a muted backdrop.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-muted">
      <main
        className="flex min-h-dvh w-full max-w-[420px] flex-col bg-background px-4 sm:border-x"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </main>
    </div>
  )
}
