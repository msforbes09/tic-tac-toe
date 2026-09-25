import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Tone } from '@/lib/banter'
import { NICKNAME_MAX, normalizeNickname, sanitizeNicknameInput } from '@/lib/identity'
import { TOP_RUNG } from '@/lib/ladder'
import { cn } from '@/lib/utils'

export type SettingsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The chosen nickname, or null before one was ever picked. */
  nickname: string | null
  /** Prefilled when there is no nickname yet, and used when the edit is not a valid nickname. */
  suggestedNickname: string
  onSaveNickname: (name: string) => void
  tone: Tone
  onToneChange: (tone: Tone) => void
  /** Developer mode only: the Developer section. Every action there closes the sheet. */
  dev?: DevSection
}

export type DevSection = {
  rung: number | null
  onSetRung: (rung: number) => void
  onReset: () => void
  onExit: () => void
}

/** Settings, from the gear on the setup screen: the nickname, the bot's attitude, and developer tools. */
export function SettingsSheet({ open, onOpenChange, nickname, suggestedNickname, onSaveNickname, tone, onToneChange, dev }: SettingsSheetProps) {
  const initial = nickname ?? suggestedNickname
  const [value, setValue] = useState(initial)
  const [rung, setRung] = useState(String(dev?.rung ?? 1))
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    if (!open) return
    setValue(initial)
    setRung(String(dev?.rung ?? 1))
    setConfirmReset(false)
  }, [open, initial, dev?.rung])
  const aggressive = tone === 'cocky'
  const parsedRung = Number(rung)
  const validRung = Number.isInteger(parsedRung) && parsedRung >= 1 && parsedRung <= TOP_RUNG

  const save = () => onSaveNickname(normalizeNickname(value) ?? initial)
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex w-full max-w-[420px] flex-col gap-6 rounded-t-[28px] px-5 pt-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="font-heading text-2xl font-semibold">Settings</SheetTitle>
          <SheetDescription>Make the game yours.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor="settings-nickname" className="font-heading text-[15px] font-medium">
            Nickname
          </label>
          <div className="flex gap-2">
            <input
              id="settings-nickname"
              value={value}
              onChange={(e) => setValue(sanitizeNicknameInput(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
              }}
              maxLength={NICKNAME_MAX}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-h-12 min-w-0 flex-1 rounded-[16px] border border-input bg-background px-4 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button className="min-h-12 rounded-[16px] px-5 text-[15px] font-medium" onClick={save}>
              Save
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Letters, digits and spaces, up to 12.</p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-[18px] bg-muted/70 px-4 py-3 dark:bg-muted/50">
          <div className="flex flex-col">
            <span id="settings-aggressive" className="font-heading text-[15px] font-medium">
              Aggressive bot
            </span>
            <span className="text-sm text-muted-foreground">Trash talk instead of cheers.</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={aggressive}
            aria-labelledby="settings-aggressive"
            onClick={() => onToneChange(aggressive ? 'friendly' : 'cocky')}
            className={cn(
              'box-border flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-150',
              aggressive ? 'justify-end bg-player-o' : 'justify-start bg-input',
            )}
          >
            <span aria-hidden="true" className="size-6 shrink-0 rounded-full bg-background" />
          </button>
        </div>

        {dev && (
          <div className="flex flex-col gap-3 rounded-[18px] border border-dashed border-border px-4 py-3">
            <span className="font-heading text-[15px] font-medium">Developer</span>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Rung</span>
              <span className="flex items-center gap-2">
                <input
                  aria-label="Rung"
                  type="number"
                  min={1}
                  max={TOP_RUNG}
                  value={rung}
                  onChange={(e) => setRung(e.target.value)}
                  className="min-h-10 w-20 rounded-xl border border-input bg-background px-3 text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  className="min-h-10 rounded-xl"
                  disabled={!validRung}
                  onClick={() => {
                    dev.onSetRung(parsedRung)
                    close()
                  }}
                >
                  Set
                </Button>
              </span>
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="min-h-11 flex-1 rounded-[14px]"
                onClick={() => {
                  if (!confirmReset) setConfirmReset(true)
                  else {
                    dev.onReset()
                    setConfirmReset(false)
                    close()
                  }
                }}
              >
                {confirmReset ? 'Tap again to confirm' : 'Reset game data'}
              </Button>
              <Button
                variant="ghost"
                className="min-h-11 rounded-[14px] px-4"
                onClick={() => {
                  dev.onExit()
                  close()
                }}
              >
                Exit developer mode
              </Button>
            </div>
          </div>
        )}

        <Button variant="secondary" className="min-h-12 w-full rounded-[16px] text-base font-medium" onClick={close}>
          Done
        </Button>
      </SheetContent>
    </Sheet>
  )
}
