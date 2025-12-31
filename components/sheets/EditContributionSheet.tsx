"use client"

import { useState, useEffect } from "react"
import { Loader2, Trash2 } from "lucide-react"
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
import { Transaction } from "@/lib/data/types"
import { toast } from "sonner"

interface EditContributionSheetProps {
    transactionId: string | null
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

type OverlayType = "amount" | "member" | null

export function EditContributionSheet({ transactionId, isOpen, onClose, onSuccess }: EditContributionSheetProps) {
    const { members } = useMembers()
    const { account, reloadAccount } = useAccount()
    const { db } = useSQLite()

    const [transaction, setTransaction] = useState<Transaction | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Form state
    const [amount, setAmount] = useState("")
    const [selectedMemberId, setSelectedMemberId] = useState<string>("")
    const [date, setDate] = useState("")
    const [note, setNote] = useState("")

    // UI state
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null)

    const humanMembers = members.filter(m => !m.is_kitty)
    const selectedMember = members.find(m => m.id === selectedMemberId)

    // Load transaction data
    useEffect(() => {
        if (!db || !transactionId || !isOpen) {
            setTransaction(null)
            return
        }

        const fetchTransaction = async () => {
            setIsLoading(true)
            try {
                const repo = new TransactionRepository(db)
                const data = await repo.getById(transactionId)
                if (data) {
                    setTransaction(data)
                    setAmount((data.amount / 100).toString())
                    setSelectedMemberId(data.member_id)
                    setDate(data.date)
                    // Don't pre-fill note with auto-generated description
                    setNote("")
                } else {
                    toast.error("Transaction not found")
                    onClose()
                }
            } catch (err) {
                console.error(err)
                toast.error("Failed to load transaction")
                onClose()
            } finally {
                setIsLoading(false)
            }
        }

        fetchTransaction()
    }, [db, transactionId, isOpen, onClose])

    const handleQuickAmount = (value: number) => {
        setAmount(value.toString())
    }

    const handleUpdate = async () => {
        if (!db || !account || !transaction || !amount || !selectedMemberId) {
            toast.error("Please fill in all fields")
            return
        }

        const amountNum = parseFloat(amount)
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        setIsSaving(true)
        try {
            const repo = new TransactionRepository(db)
            const amountInCents = Math.round(amountNum * 100)

            await repo.update(transaction.id, {
                member_id: selectedMemberId,
                type: "DEPOSIT",
                amount: amountInCents,
                // If user entered a note, use it; otherwise keep existing description
                description: note || transaction.description,
                date,
            })

            toast.success("Contribution updated")
            await reloadAccount()
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error("Failed to update contribution:", error)
            toast.error("Failed to update contribution")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!db || !transactionId) return

        if (!confirm("Are you sure you want to delete this contribution? This action cannot be undone.")) {
            return
        }

        setIsDeleting(true)
        try {
            const repo = new TransactionRepository(db)
            await repo.softDelete(transactionId)
            toast.success("Contribution deleted")
            await reloadAccount()
            onSuccess?.()
            onClose()
        } catch (err) {
            console.error(err)
            toast.error("Failed to delete contribution")
        } finally {
            setIsDeleting(false)
        }
    }

    const getCurrencySymbol = (currency?: string) => {
        const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" }
        return symbols[currency || "GBP"] || currency || "£"
    }

    const currencySymbol = getCurrencySymbol(account?.currency)
    const canSubmit = amount && parseFloat(amount) > 0 && selectedMemberId

    return (
        <>
            <AnimatedSheet isOpen={isOpen} onClose={onClose}>
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
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

                            {/* Optional Details with Delete */}
                            <CollapsibleSection title="More options">
                                <FormDateInput label="Date" value={date} onChange={setDate} />
                                <FormDivider />
                                <FormTextArea
                                    label="Note"
                                    value={note}
                                    onChange={setNote}
                                    placeholder="Add a note..."
                                />
                                <FormDivider />
                                {/* Delete */}
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="w-full px-4 py-3.5 flex items-center gap-3 text-destructive/70 hover:text-destructive active:bg-destructive/5 transition-colors disabled:opacity-50"
                                    type="button"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                                        <Trash2 className="h-5 w-5" />
                                    </div>
                                    <span className="text-[15px] font-medium">
                                        {isDeleting ? "Deleting..." : "Delete contribution"}
                                    </span>
                                </button>
                            </CollapsibleSection>
                        </div>

                        {/* Bottom Actions */}
                        <SheetActions
                            onCancel={onClose}
                            onSubmit={handleUpdate}
                            submitLabel={amount ? `Save ${currencySymbol}${amount}` : "Save Changes"}
                            canSubmit={!!canSubmit}
                            isSubmitting={isSaving}
                            submittingLabel="Saving..."
                        />
                    </>
                )}
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
