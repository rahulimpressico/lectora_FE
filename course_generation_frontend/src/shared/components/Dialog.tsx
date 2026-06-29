/**
 * Thin wrappers around @radix-ui/react-dialog.
 * Handles: Portal, Overlay, focus trap, Escape key, body scroll lock.
 * Consumers keep their own panel markup — this only provides the backdrop shell.
 */
import type { ReactNode } from 'react'
import * as Dlg from '@radix-ui/react-dialog'

export const DialogTitle = Dlg.Title
export const DialogClose = Dlg.Close

export interface DialogContentProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /**
   * When false, clicking the backdrop does NOT close the dialog (e.g. while
   * a delete/save operation is in progress). Defaults to true.
   */
  closeOnInteractOutside?: boolean
}

export function DialogContent({
  open,
  onClose,
  children,
  closeOnInteractOutside = true,
}: DialogContentProps) {
  return (
    <Dlg.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Dlg.Portal>
        <Dlg.Overlay className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-[4px]" />
        <Dlg.Content
          className="fixed inset-0 z-[201] flex items-center justify-center p-4 outline-none"
          onPointerDownOutside={(e) => { if (!closeOnInteractOutside) e.preventDefault() }}
        >
          {children}
        </Dlg.Content>
      </Dlg.Portal>
    </Dlg.Root>
  )
}
