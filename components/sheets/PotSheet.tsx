"use client"

import { useState, useEffect } from "react"
import { AnimatedSheet } from "@/components/common/AnimatedSheet"
import {
    FormCard,
    FormTextInput,
    FormDivider,
    SheetActions
} from "@/components/common/sheet"
import { cn } from "@/lib/utils"
import { Account } from "@/lib/data/types"
import { POT_EMOJIS, CURRENCIES } from "@/lib/constants/pot"

interface PotSheetProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (pot: { name: string; emoji: string; currency: string }) => void
    /** Pass account to edit, or undefined for create mode */
    pot?: Account | null
    /** Loading state for submit button */
    isSubmitting?: boolean
}

export function PotSheet({ isOpen, onClose, onSubmit, pot, isSubmitting = false }: PotSheetProps) {
    const [name, setName] = useState("")
    const [emoji, setEmoji] = useState("🏠")
    const [currency, setCurrency] = useState("GBP")

    const isEditMode = !!pot

    // Initialize/reset form when sheet opens
    useEffect(() => {
        if (isOpen) {
            if (pot) {
                setName(pot.name)
                setEmoji(pot.emoji || "🏠")
                setCurrency(pot.currency)
            } else {
                setName("")
                setEmoji("🏠")
                setCurrency("GBP")
            }
        }
    }, [isOpen, pot])

    const handleSubmit = () => {
        if (!name.trim()) return
        onSubmit({ name: name.trim(), emoji, currency })
    }

    const canSubmit = name.trim().length > 0 && !isSubmitting
    const selectedCurrency = CURRENCIES.find(c => c.code === currency)

    return (
        <AnimatedSheet isOpen={isOpen} onClose={onClose}>
            {/* Hero Preview - shows emoji and pot name */}
            <div className="py-8 flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl">
                    {emoji}
                </div>
                <span className={cn(
                    "text-lg font-medium transition-colors",
                    name ? "text-foreground" : "text-muted-foreground/40"
                )}>
                    {name || "Pot name"}
                </span>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-4">
                <FormCard>
                    {/* Name Input */}
                    <FormTextInput
                        label="Name"
                        value={name}
                        onChange={setName}
                        placeholder="e.g. Household Expenses"
                    />
                    <FormDivider />

                    {/* Emoji Picker */}
                    <div className="px-4 py-3">
                        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium block mb-3">
                            Icon
                        </label>
                        <div className="grid grid-cols-8 gap-2">
                            {POT_EMOJIS.map((e) => (
                                <button
                                    key={e}
                                    type="button"
                                    onClick={() => setEmoji(e)}
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                                        emoji === e
                                            ? "bg-primary/10 ring-2 ring-primary scale-110"
                                            : "bg-muted/50 hover:bg-muted active:scale-95"
                                    )}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    <FormDivider />

                    {/* Currency Picker */}
                    <div className="px-4 py-3">
                        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium block mb-3">
                            Currency
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {CURRENCIES.map((c) => (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => setCurrency(c.code)}
                                    className={cn(
                                        "py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                                        currency === c.code
                                            ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted active:scale-95"
                                    )}
                                >
                                    {c.symbol}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-2 text-center">
                            {selectedCurrency?.name}
                        </p>
                    </div>
                </FormCard>
            </div>

            {/* Actions */}
            <SheetActions
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitLabel={isEditMode ? "Save Changes" : "Create Pot"}
                canSubmit={canSubmit}
                isSubmitting={isSubmitting}
                submittingLabel="Creating..."
            />
        </AnimatedSheet>
    )
}
