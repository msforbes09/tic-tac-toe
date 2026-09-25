import { Colophon } from "@/components/Colophon"
import { Logo } from "@/components/Logo"

/**
 * The room behind the phone column on wide screens: a glow in each mark colour, drifting
 * slowly, the logo drawn huge and faint so the X sits left of the column and the O to its
 * lower right, the brand in the top-right corner and the version line in the bottom-right.
 * Hidden below the `sm` breakpoint, where the column fills the viewport.
 */
/** `chrome` adds the brand and version corners; the splash, being the brand, leaves them out. */
export function Backdrop({ chrome = true }: { chrome?: boolean } = {}) {
  return (
    <div data-testid="backdrop" aria-hidden="true" className="room-backdrop">
      <div className="room-glow room-glow-x" />
      <div className="room-glow room-glow-o" />
      <Logo className="room-logo" />
      {chrome && (
        <>
          <div className="room-brand">
            <Logo className="size-9" />
            <span>Tic-Tac-Toe</span>
          </div>
          <p className="room-colophon">
            <Colophon />
          </p>
        </>
      )}
    </div>
  )
}
