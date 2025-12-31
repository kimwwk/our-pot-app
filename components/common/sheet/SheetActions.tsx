"use client"

import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SheetActionsProps {
    /** Cancel/close handler */
    onCancel: () => void
    /** Submit handler */
    onSubmit: () => void
    /** Submit button label */
    submitLabel?: string
    /** Whether submit is allowed */
    canSubmit?: boolean
    /** Show loading state on submit button */
    isSubmitting?: boolean
    /** Loading label */
    submittingLabel?: string
    className?: string
}

/**
 * Bottom action buttons for sheets.
 * Provides a cancel (X) button and primary submit button.
 *
 * @example
 * <SheetActions
 *   onCancel={onClose}
 *   onSubmit={handleSave}
 *   submitLabel="Save Expense"
 *   canSubmit={isValid}
 *   isSubmitting={isSaving}
 * />
 */
export function SheetActions({
    onCancel,
    onSubmit,
    submitLabel = "Save",
    canSubmit = true,
    isSubmitting = false,
    submittingLabel = "Saving...",
    className
}: SheetActionsProps) {
    return (
        <div className={cn("px-4 py-4 flex items-center gap-3", className)}>
            <button
                onClick={onCancel}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground hover:bg-muted active:scale-95 transition-all"
                type="button"
            >
                <X className="w-5 h-5" />
            </button>
            <Button
                onClick={onSubmit}
                disabled={!canSubmit || isSubmitting}
                className={cn(
                    "flex-1 h-12 rounded-full text-[15px] font-semibold transition-all active:scale-[0.98]",
                    canSubmit && !isSubmitting
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                        : "bg-muted/50 text-muted-foreground/40 hover:bg-muted/50 shadow-none"
                )}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {submittingLabel}
                    </>
                ) : (
                    submitLabel
                )}
            </Button>
        </div>
    )
}
