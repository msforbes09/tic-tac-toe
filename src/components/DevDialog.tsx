import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export type DevDialogProps = {
  open: boolean
  onClose: () => void
  onEnter: () => void
}

/**
 * The prompt after the secret knock: Enter turns developer mode on. Both buttons close the dialog
 * through `onClose`, which the app uses to return to the setup screen. The developer tools
 * themselves live in Settings while developer mode is on.
 */
export function DevDialog({ open, onClose, onEnter }: DevDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[24px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Developer mode</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
