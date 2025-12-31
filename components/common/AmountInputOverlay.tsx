"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Delete } from "lucide-react"

interface AmountInputOverlayProps {
    isOpen: boolean
    onClose: () => void
    amount: string
    onAmountChange: (amount: string) => void
    currencySymbol?: string
}

export function AmountInputOverlay({
    isOpen,
    onClose,
    amount,
    onAmountChange,
}: AmountInputOverlayProps) {
    const handleNumpadPress = (key: string) => {
        if (key === "delete") {
            onAmountChange(amount.slice(0, -1))
        } else if (key === ".") {
            if (!amount.includes(".")) {
                onAmountChange(amount === "" ? "0." : amount + ".")
            }
        } else {
            // Limit decimal places to 2
            const parts = amount.split(".")
            if (parts[1] && parts[1].length >= 2) return
            onAmountChange(amount + key)
        }
    }

    const numpadKeys = [
        ["1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"],
        [".", "0", "delete"],
    ]

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 380 }}
                    className="fixed bottom-0 left-0 right-0 bg-background z-[110] border-t border-border/40"
                    style={{ borderRadius: "24px 24px 0 0" }}
                >
                    {/* Numpad Grid - No amount display, it shows on the form behind */}
                    <div className="px-4 pt-4 pb-6">
                        <div className="grid grid-cols-3 gap-3">
                            {numpadKeys.flat().map((key) => (
                                <button
                                    key={key}
                                    onClick={() => handleNumpadPress(key)}
                                    className="h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 active:bg-muted bg-muted/30 hover:bg-muted/50"
                                    type="button"
                                >
                                    {key === "delete" ? (
                                        <Delete className="h-6 w-6 text-muted-foreground" />
                                    ) : (
                                        <span className="text-2xl font-medium">{key}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Done Button */}
                        <button
                            onClick={onClose}
                            disabled={!amount || parseFloat(amount) <= 0}
                            className={`w-full mt-4 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.98] ${
                                amount && parseFloat(amount) > 0
                                    ? "bg-foreground text-background"
                                    : "bg-muted/50 text-muted-foreground/40"
                            }`}
                            type="button"
                        >
                            Done
                        </button>
                    </div>

                    <div className="pb-safe" />
                </motion.div>
            )}
        </AnimatePresence>
    )
}
