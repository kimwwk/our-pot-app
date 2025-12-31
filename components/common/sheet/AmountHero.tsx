"use client"

import { cn } from "@/lib/utils"

interface AmountHeroProps {
    amount: string
    currencySymbol?: string
    onTap?: () => void
    className?: string
}

/**
 * Format amount string for display with 2 decimal places.
 * - "" → "0.00"
 * - "100" → "100.00"
 * - "100.5" → "100.50"
 * - "100.50" → "100.50"
 * - "0." → "0." (typing in progress)
 */
function formatDisplayAmount(amount: string): string {
    if (!amount) return "0.00"

    // If user is typing decimal (ends with .), show as-is
    if (amount.endsWith(".")) return amount

    // If has decimal point, pad to 2 places
    if (amount.includes(".")) {
        const [whole, decimal] = amount.split(".")
        return `${whole}.${decimal.padEnd(2, "0")}`
    }

    // No decimal, add .00
    return `${amount}.00`
}

/**
 * Large tappable amount display for sheets.
 * Shows currency symbol and amount in hero style at top of sheet.
 * Amount updates live when used with AmountInputOverlay.
 * Automatically formats to 2 decimal places for display.
 */
export function AmountHero({
    amount,
    currencySymbol = "£",
    onTap,
    className
}: AmountHeroProps) {
    const displayAmount = formatDisplayAmount(amount)

    return (
        <button
            onClick={onTap}
            className={cn("w-full py-8 flex flex-col items-center", className)}
            type="button"
            disabled={!onTap}
        >
            <div className="flex items-baseline">
                <span className="text-3xl text-muted-foreground/40 mr-1 font-light">
                    {currencySymbol}
                </span>
                <span className={cn(
                    "text-6xl font-bold tracking-tight transition-colors",
                    amount ? "text-foreground" : "text-muted-foreground/20"
                )}>
                    {displayAmount}
                </span>
            </div>
        </button>
    )
}
