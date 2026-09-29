"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog"

/**
 * Bottom sheet: o mesmo Dialog do Base UI, ancorado embaixo.
 * Use com <Dialog> / <DialogTitle> de "@/components/ui/dialog".
 * (Animação com data-[starting-style]/data-[ending-style]: sintaxe do Tailwind 3.)
 */
function SheetContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPortal>
      <DialogOverlay className="bg-black/30" />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl bg-popover text-popover-foreground shadow-xl outline-none transition-transform duration-200 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
          className
        )}
        {...props}
      >
        <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border" />
        {children}
        <DialogPrimitive.Close
          render={<Button variant="ghost" size="icon-touch" className="absolute right-2 top-2" />}
          aria-label="Fechar"
        >
          <XIcon />
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

export { SheetContent }
