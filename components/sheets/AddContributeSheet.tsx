"use client"

import { useState, useEffect } from "react"
import { AnimatedSheet } from "@/components/common/AnimatedSheet"
import { AmountInputOverlay } from "@/components/common/AmountInputOverlay"
import { MemberPickerOverlay } from "@/components/common/MemberPickerOverlay"
import {
    AmountHero,
    FormCard,
    FormDivider,
    FormFieldButton,
    QuickAmountButtons,
    CollapsibleSection,
    FormDateInput,
    FormTextArea,
    SheetActions
} from "@/components/common/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMembers } from "@/lib/data/hooks/useMembers"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { useSQLite } from "@/lib/data/contexts/SQLiteContext"
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository"
import { ulid } from "ulid"
import { toast } from "sonner"
import { getTodayDateString } from "@/lib/utils"

interface AddContributeSheetProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

type OverlayType = "amount" | "member" | null

export function AddContributeSheet({ isOpen, onClose, onSuccess }: AddContributeSheetProps) {
    const { members } = useMembers()
    const { account, reloadAccount } = useAccount()
    const { db } = useSQLite()

    // Form state
    const [amount, setAmount] = useState("")
    const [selectedMemberId, setSelectedMemberId] = useState<string>("")
    const [date, setDate] = useState(() => getTodayDateString())
    const [note, setNote] = useState("")

    // UI state
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const humanMembers = members.filter(m => !m.is_kitty)
    const selectedMember = members.find(m => m.id === selectedMemberId)

    // Reset form when sheet closes
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setAmount("")
                setSelectedMemberId("")
                setDate(getTodayDateString())
                setNote("")
                setActiveOverlay(null)
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    const handleQuickAmount = (value: number) => {
        setAmount(value.toString())
    }

    const handleSubmit = async () => {
        if (!db || !account || !amount || !selectedMemberId) {
            toast.error("Please fill in all fields")
            return
        }

        const amountNum = parseFloat(amount)
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        setIsSubmitting(true)
        try {
            const repo = new TransactionRepository(db)
            const now = new Date().toISOString()

            // Convert amount to cents
            const amountInCents = Math.round(amountNum * 100)

            await repo.create({
                id: ulid(),
                account_id: account.id,
                member_id: selectedMemberId,
                category_id: undefined,
                type: "DEPOSIT",
                amount: amountInCents,
                merchant: undefined,
                description: note || `Contribution from ${selectedMember?.name || 'member'}`,
                date,
                status: "completed",
                created_at: now,
                updated_at: now,
            })

            toast.success(`Added ${currencySymbol}${amountNum.toFixed(2)} contribution`)
            await reloadAccount()
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error("Failed to add contribution:", error)
            toast.error("Failed to add contribution")
        } finally {
            setIsSubmitting(false)
        }
    }

    const getCurrencySymbol = (currency?: string) => {
        const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" }
        return symbols[currency || "GBP"] || currency || "£"
    }

    const currencySymbol = getCurrencySymbol(account?.currency)
    const canSubmit = amount && parseFloat(amount) > 0 && selectedMemberId
    const hasDetails = !!note || date !== getTodayDateString()

    return (
        <>
            <AnimatedSheet isOpen={isOpen} onClose={onClose}>
                {/* Amount Hero - Tappable */}
                <AmountHero
                    amount={amount}
                    currencySymbol={currencySymbol}
                    onTap={() => setActiveOverlay("amount")}
                />

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto px-4">
                    {/* Quick Amount Buttons */}
                    <QuickAmountButtons
                        amounts={[50, 100, 200, 500]}
                        currencySymbol={currencySymbol}
                        onSelect={handleQuickAmount}
                        selectedAmount={parseFloat(amount) || undefined}
                        className="mb-4"
                    />

                    {/* Main Fields Card */}
                    <FormCard>
                        <FormFieldButton
                            icon={
                                selectedMember ? (
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={selectedMember.avatar_url} />
                                        <AvatarFallback className="text-[10px]">
                                            {selectedMember.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-muted" />
                                )
                            }
                            label="Contributor"
                            value={selectedMember?.name}
                            placeholder="Select member"
                            onTap={() => setActiveOverlay("member")}
                        />
                    </FormCard>

                    {/* No members warning */}
                    {humanMembers.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2 px-1">
                            No members yet. Add members in settings.
                        </p>
                    )}

                    {/* Optional Details */}
                    <CollapsibleSection title="More options" forceExpanded={hasDetails}>
                        <FormDateInput label="Date" value={date} onChange={setDate} />
                        <FormDivider />
                        <FormTextArea
                            label="Note"
                            value={note}
                            onChange={setNote}
                            placeholder="Add a note..."
                        />
                    </CollapsibleSection>
                </div>

                {/* Bottom Actions */}
                <SheetActions
                    onCancel={onClose}
                    onSubmit={handleSubmit}
                    submitLabel={amount ? `Add ${currencySymbol}${amount}` : "Add Contribution"}
                    canSubmit={!!canSubmit}
                    isSubmitting={isSubmitting}
                    submittingLabel="Adding..."
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

            <MemberPickerOverlay
                isOpen={activeOverlay === "member"}
                onClose={() => setActiveOverlay(null)}
                members={humanMembers}
                selectedMemberId={selectedMemberId}
                onSelect={setSelectedMemberId}
                title="Contributor"
                showPotOption={false}
                memberDescription="Adding to pot"
            />
        </>
    )
}
