import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Tone } from '@/lib/banter'
import { NICKNAME_MAX, normalizeNickname, sanitizeNicknameInput } from '@/lib/identity'
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
}

/** Settings, from the gear on the setup screen: the nickname and the bot's attitude. */
export function SettingsSheet({ open, onOpenChange, nickname, suggestedNickname, onSaveNickname, tone, onToneChange }: SettingsSheetProps) {
  const initial = nickname ?? suggestedNickname
  const [value, setValue] = useState(initial)
  useEffect(() => {
    if (open) setValue(initial)
  }, [open, initial])
  const aggressive = tone === 'cocky'

  const save = () => onSaveNickname(normalizeNickname(value) ?? initial)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex w-full max-w-[420px] flex-col gap-6 rounded-t-[28px] px-5 pt-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="font-heading text-2xl font-semibold">Settings</SheetTitle>
          <SheetDescription>Your name in rooms, and how the bot talks.</SheetDescription>
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
              'relative h-8 w-14 shrink-0 rounded-full transition-colors duration-150',
              aggressive ? 'bg-player-o' : 'bg-input',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1 size-6 rounded-full bg-background transition-transform duration-150',
                aggressive ? 'translate-x-7' : 'translate-x-1',
              )}
            />
          </button>
        </div>

        <Button
          variant="secondary"
          className="min-h-12 w-full rounded-[16px] text-base font-medium"
          onClick={() => onOpenChange(false)}
        >
          Done
        </Button>
      </SheetContent>
    </Sheet>
  )
}
