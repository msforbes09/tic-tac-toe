import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SheetClose } from '@/components/ui/sheet'

/** The one way out of a full-height sheet: a round Back floating bottom-left over the list. */
export function FloatingBack({ onClick }: { onClick?: () => void }) {
  return (
    <SheetClose
      render={
        <Button
          size="icon"
          aria-label="Back"
          onClick={onClick}
          className="absolute bottom-6 left-5 size-11 rounded-full shadow-[0_8px_24px_-8px_oklch(0_0_0/0.8)]"
        />
      }
    >
      <ChevronLeft className="size-5" strokeWidth={2.5} aria-hidden="true" />
    </SheetClose>
  )
}
