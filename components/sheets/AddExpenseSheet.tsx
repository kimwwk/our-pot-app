"use client"

import { useState, useEffect } from "react"
import { Wallet } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AnimatedSheet } from "@/components/common/AnimatedSheet"
import { AmountInputOverlay } from "@/components/common/AmountInputOverlay"
import { CategoryPickerOverlay } from "@/components/common/CategoryPickerOverlay"
import { MemberPickerOverlay } from "@/components/common/MemberPickerOverlay"
import {
    AmountHero,
    FormCard,
    FormDivider,
    FormFieldButton,
    FormTextInput,
    CollapsibleSection,
    FormDateInput,
    FormTextArea,
    SheetActions
} from "@/components/common/sheet"
import { useCategories } from "@/lib/data/hooks/useCategories"
import { useMembers } from "@/lib/data/hooks/useMembers"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { getTodayDateString } from "@/lib/utils"

interface AddExpenseSheetProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (expense: {
        description: string
        amount: number
        categoryId: string
        memberId: string
        date: string
        note?: string
    }) => void
}

type OverlayType = "amount" | "category" | "payer" | null

export function AddExpenseSheet({ isOpen, onClose, onSubmit }: AddExpenseSheetProps) {
    const { categories } = useCategories()
    const { members } = useMembers()
    const { account } = useAccount()

    // Form state
    const [merchant, setMerchant] = useState("")
    const [amount, setAmount] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("")
    const [memberId, setMemberId] = useState<string>("")
    const [date, setDate] = useState(() => getTodayDateString())
    const [note, setNote] = useState("")

    // UI state
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null)

    const kittyMember = members.find(m => m.is_kitty)
    const selectedCategoryData = categories.find(c => c.id === selectedCategory)
    const selectedPayerData = members.find(m => m.id === memberId)

    // Auto-init memberId to kitty when members load
    useEffect(() => {
        if (!memberId && kittyMember) {
            setMemberId(kittyMember.id)
        }
    }, [memberId, kittyMember])

    // Open amount overlay first when sheet opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setActiveOverlay("amount")
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    // Reset form when sheet closes
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setMerchant("")
                setAmount("")
                setSelectedCategory("")
                setMemberId("")
                setDate(getTodayDateString())
                setNote("")
                setActiveOverlay(null)
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    const handleSubmit = () => {
        const amountNum = parseFloat(amount)
        if (amountNum > 0 && selectedCategory) {
            const finalMemberId = memberId || kittyMember?.id

            if (!finalMemberId) {
                console.error("No payer selected and no kitty found")
                return
            }

            onSubmit({
                description: merchant || selectedCategoryData?.name || "Expense",
                amount: amountNum,
                categoryId: selectedCategory,
                memberId: finalMemberId,
                date,
                note: note || undefined
            })

            onClose()
        }
    }

    const canSubmit = amount && parseFloat(amount) > 0 && selectedCategory

    const getCurrencySymbol = (curr?: string) => {
        const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" }
        return symbols[curr || "GBP"] || curr || "£"
    }

    const currencySymbol = getCurrencySymbol(account?.currency)
    const hasDetails = !!note || date !== getTodayDateString()

    return (
        <>
            <AnimatedSheet isOpen={isOpen} onClose={onClose}>
                {/* Amount Hero - Tappable, updates live when numpad is open */}
                <AmountHero
                    amount={amount}
                    currencySymbol={currencySymbol}
                    onTap={() => setActiveOverlay("amount")}
                />

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto px-4">
                    {/* Main Fields Card */}
                    <FormCard>
                        <FormTextInput
                            label="Merchant"
                            value={merchant}
                            onChange={setMerchant}
                            placeholder="Where did you spend?"
                            onBlur={() => {
                                // Open category picker after merchant entry if no category selected
                                if (merchant && !selectedCategory) {
                                    setTimeout(() => setActiveOverlay("category"), 150)
                                }
                            }}
                        />
                        <FormDivider />
                        <FormFieldButton
                            icon={<span className="text-xl">{selectedCategoryData?.icon || '📦'}</span>}
                            label="Category"
                            value={selectedCategoryData?.name}
                            placeholder="Select category"
                            onTap={() => setActiveOverlay("category")}
                        />
                        <FormDivider />
                        <FormFieldButton
                            icon={
                                selectedPayerData?.is_kitty ? (
                                    <Wallet className="h-5 w-5 text-primary" />
                                ) : selectedPayerData ? (
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={selectedPayerData.avatar_url} />
                                        <AvatarFallback className="text-[10px]">
                                            {selectedPayerData.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-muted" />
                                )
                            }
                            label="Paid by"
                            value={selectedPayerData?.is_kitty ? "The Pot" : selectedPayerData?.name}
                            placeholder="Select payer"
                            badge={
                                selectedPayerData && !selectedPayerData.is_kitty ? (
                                    <span className="text-[9px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                                        REIMBURSE
                                    </span>
                                ) : undefined
                            }
                            onTap={() => setActiveOverlay("payer")}
                        />
                    </FormCard>

                    {/* Optional Details Section (Date & Note) */}
                    <CollapsibleSection title="More options" forceExpanded={hasDetails}>
                        <FormDateInput label="Date" value={date} onChange={setDate} />
                        <FormDivider />
                        <FormTextArea
                            label="Note"
                            value={note}
                            onChange={setNote}
                            placeholder="Add details..."
                        />
                    </CollapsibleSection>
                </div>

                {/* Bottom Action Buttons */}
                <SheetActions
                    onCancel={onClose}
                    onSubmit={handleSubmit}
                    submitLabel="Save Expense"
                    canSubmit={!!canSubmit}
                />
            </AnimatedSheet>

            {/* Overlays */}
            <AmountInputOverlay
                isOpen={activeOverlay === "amount"}
                onClose={() => setActiveOverlay(null)}
                amount={amount}
                onAmountChange={setAmount}
                currencySymbol={currencySymbol}
            />

            <CategoryPickerOverlay
                isOpen={activeOverlay === "category"}
                onClose={() => setActiveOverlay(null)}
                categories={categories}
                selectedCategoryId={selectedCategory}
                onSelect={setSelectedCategory}
            />

            <MemberPickerOverlay
                isOpen={activeOverlay === "payer"}
                onClose={() => setActiveOverlay(null)}
                members={members}
                selectedMemberId={memberId}
                onSelect={setMemberId}
                title="Paid by"
                potLabel="The Pot"
                potDescription="From shared pot"
                memberDescription="Pot will reimburse"
            />
        </>
    )
}
