"use client"

import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormFieldButtonProps {
    /** Icon element (emoji, Lucide icon, Avatar, etc.) */
    icon: React.ReactNode
    /** Field label (uppercase, small) */
    label: string
    /** Current value or placeholder */
    value?: string
    /** Placeholder when no value */
    placeholder?: string
    /** Optional badge/tag next to value */
    badge?: React.ReactNode
    /** Click handler to open picker/overlay */
    onTap: () => void
    /** Custom icon container className */
    iconClassName?: string
    className?: string
    /** Whether this field is required (shows red asterisk) */
    required?: boolean
    /** Error message to display */
    error?: string
}

/**
 * Tappable field row with icon, label, value and chevron.
 * Used for picker fields like Category, Paid By, Member, etc.
 *
 * @example
 * <FormFieldButton
 *   icon={<Wallet className="h-5 w-5 text-primary" />}
 *   label="Paid by"
 *   value="The Pot"
 *   onTap={() => setActiveOverlay("payer")}
 * />
 */
export function FormFieldButton({
    icon,
    label,
    value,
    placeholder = "Select...",
    badge,
    onTap,
    iconClassName,
    className,
    required,
    error
}: FormFieldButtonProps) {
    return (
        <button
            onClick={onTap}
            className={cn(
                "w-full px-4 py-4 flex items-center gap-3 text-left active:bg-muted/50 transition-colors",
                error && "bg-destructive/5",
                className
            )}
            type="button"
        >
            <div className={cn(
                "w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center text-xl",
                error && "bg-destructive/10",
                iconClassName
            )}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium block">
                    {label}
                    {required && <span className="text-destructive ml-0.5">*</span>}
                </span>
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[15px] truncate",
                        value ? "text-foreground" : "text-muted-foreground/40",
                        error && !value && "text-destructive/60"
                    )}>
                        {value || placeholder}
                    </span>
                    {badge}
                </div>
                {error && (
                    <span className="text-[11px] text-destructive mt-0.5 block">
                        {error}
                    </span>
                )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
        </button>
    )
}
