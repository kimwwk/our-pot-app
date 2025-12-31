"use client"

import { cn } from "@/lib/utils"

interface QuickAmountButtonsProps {
    amounts?: number[]
    currencySymbol?: string
    onSelect: (amount: number) => void
    selectedAmount?: number
    className?: string
}

/**
 * Quick amount selection buttons for contributions.
 * Displays preset amounts in a horizontal row.
 *
 * @example
 * <QuickAmountButtons
 *   amounts={[50, 100, 200, 500]}
 *   currencySymbol="£"
 *   onSelect={(amt) => setAmount(amt.toString())}
 *   selectedAmount={parseFloat(amount)}
 * />
 */
export function QuickAmountButtons({
    amounts = [50, 100, 200, 500],
    currencySymbol = "£",
    onSelect,
    selectedAmount,
    className
}: QuickAmountButtonsProps) {
    return (
        <div className={cn("grid grid-cols-4 gap-2", className)}>
            {amounts.map((value) => {
                const isSelected = selectedAmount === value
                return (
                    <button
                        key={value}
                        onClick={() => onSelect(value)}
                        className={cn(
                            "h-12 rounded-xl text-[15px] font-medium transition-all active:scale-95",
                            isSelected
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-muted/40 text-foreground hover:bg-muted/60"
                        )}
                        type="button"
                    >
                        {currencySymbol}{value}
                    </button>
                )
            })}
        </div>
    )
}
