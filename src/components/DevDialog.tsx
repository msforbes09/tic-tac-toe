import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { TOP_RUNG } from '@/lib/ladder'

export type DevDialogProps = {
  /** 'enter' after the knock (Enter / Cancel); 'panel' from the chip once developer mode is on. */
  mode: 'enter' | 'panel' | null
  rung: number | null
  onClose: () => void
  onEnter: () => void
  onSetRung: (rung: number) => void
  onReset: () => void
  onExit: () => void
}

/** Developer mode: opened by the secret knock, then from the game chip while it is on. */
export function DevDialog({ mode, rung, onClose, onEnter, onSetRung, onReset, onExit }: DevDialogProps) {
  const [value, setValue] = useState(String(rung ?? 1))
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    setValue(String(rung ?? 1))
    setConfirmReset(false)
  }, [mode, rung])

  const parsed = Number(value)
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= TOP_RUNG

  return (
    <AlertDialog open={mode !== null} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[24px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Developer mode</AlertDialogTitle>
        </AlertDialogHeader>
        {mode === 'panel' && (
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Rung</span>
              <span className="flex items-center gap-2">
                <input
                  aria-label="Rung"
                  type="number"
                  min={1}
                  max={TOP_RUNG}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="min-h-10 w-20 rounded-xl border border-input bg-background px-3 text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <AlertDialogAction
                  className="min-h-10"
                  disabled={!valid}
                  onClick={() => {
                    onSetRung(parsed)
                    onClose()
                  }}
                >
                  Set
                </AlertDialogAction>
              </span>
            </label>
            <Button
              variant="outline"
              className="min-h-11 rounded-[14px]"
              onClick={() => {
                if (!confirmReset) setConfirmReset(true)
                else {
                  onReset()
                  setConfirmReset(false)
                }
              }}
            >
              {confirmReset ? 'Tap again to confirm' : 'Reset game data'}
            </Button>
          </div>
        )}
        <AlertDialogFooter>
          {mode === 'enter' ? (
            <>
              <AlertDialogCancel className="min-h-11" onClick={onClose}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="min-h-11"
                onClick={() => {
                  onEnter()
                  onClose()
                }}
              >
                Enter
              </AlertDialogAction>
            </>
          ) : (
            <>
              <AlertDialogCancel
                className="min-h-11"
                onClick={() => {
                  onExit()
                  onClose()
                }}
              >
                Exit
              </AlertDialogCancel>
              <AlertDialogAction className="min-h-11" onClick={onClose}>
                Done
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
