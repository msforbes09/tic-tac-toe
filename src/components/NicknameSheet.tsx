import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { normalizeNickname } from '@/lib/identity'

export type NicknameSheetProps = {
  open: boolean
  /** The random themed name, prefilled and used when the edit is not a valid nickname. */
  initial: string
  onSave: (name: string) => void
}

/** Shown the first time someone picks Online, and again from the pencil next to their name. */
export function NicknameSheet({ open, initial, onSave }: NicknameSheetProps) {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    if (open) setValue(initial)
  }, [open, initial])

  const save = () => onSave(normalizeNickname(value) ?? initial)

  return (
    <Sheet open={open} onOpenChange={() => {}}>
      <SheetContent
        side="bottom"
        className="mx-auto flex w-full max-w-[420px] flex-col gap-5 rounded-t-[28px] px-5 pt-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="text-2xl font-bold tracking-tight">Your nickname</SheetTitle>
          <SheetDescription>Others in a room see this name. You can change it any time.</SheetDescription>
        </SheetHeader>
        <input
          aria-label="Nickname"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
          }}
          maxLength={20}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-14 w-full rounded-[18px] border border-input bg-background px-4 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button size="lg" className="min-h-14 w-full rounded-[18px] text-base font-semibold" onClick={save}>
          Save
        </Button>
      </SheetContent>
    </Sheet>
  )
}
