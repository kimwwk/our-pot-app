"use client"

import { useState, useEffect } from "react"
import { Loader2, Trash2, Wallet } from "lucide-react"
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
import { useSQLite } from "@/lib/data/contexts/SQLiteContext"
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository"
import { Transaction } from "@/lib/data/types"
import { toast } from "sonner"

interface EditExpenseSheetProps {
    transactionId: string | null
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

type OverlayType = "amount" | "category" | "payer" | null

export function EditExpenseSheet({ transactionId, isOpen, onClose, onSuccess }: EditExpenseSheetProps) {
    const { categories } = useCategories()
    const { members } = useMembers()
    const { account, reloadAccount } = useAccount()
    const { db } = useSQLite()

    const [transaction, setTransaction] = useState<Transaction | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Form state
    const [merchant, setMerchant] = useState("")
    const [amount, setAmount] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("")
    const [memberId, setMemberId] = useState<string>("")
    const [date, setDate] = useState("")
    const [note, setNote] = useState("")

    // UI state
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null)

    const selectedCategoryData = categories.find(c => c.id === selectedCategory)
    const selectedPayerData = members.find(m => m.id === memberId)

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
                    setMerchant(data.description)
                    setAmount((Math.abs(data.amount) / 100).toString())
                    setSelectedCategory(data.category_id || "")
                    setMemberId(data.member_id)
                    setDate(data.date)
                    setNote(data.note || "")
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

    const handleUpdate = async () => {
        if (!db || !account || !transaction || !merchant || !amount || !selectedCategory) return

        setIsSaving(true)
        try {
            const repo = new TransactionRepository(db)
            const cents = Math.round(parseFloat(amount) * 100)

            await repo.update(transaction.id, {
                member_id: memberId,
                category_id: selectedCategory,
                type: "EXPENSE",
                amount: Math.abs(cents),
                description: merchant,
                note: note || undefined,
                date: date || transaction.date,
            })

            toast.success("Expense updated")
            await reloadAccount()
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error("Failed to update expense")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!db || !transactionId) return

        if (!confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
            return
        }

        setIsDeleting(true)
        try {
            const repo = new TransactionRepository(db)
            await repo.softDelete(transactionId)
            toast.success("Expense deleted")
            await reloadAccount()
            onSuccess?.()
            onClose()
        } catch (err) {
            console.error(err)
            toast.error("Failed to delete expense")
        } finally {
            setIsDeleting(false)
        }
    }

    const canSubmit = amount && parseFloat(amount) > 0 && selectedCategory

    const getCurrencySymbol = (curr?: string) => {
        const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" }
        return symbols[curr || "GBP"] || curr || "£"
    }

    const currencySymbol = getCurrencySymbol(account?.currency)

    return (
        <>
            <AnimatedSheet isOpen={isOpen} onClose={onClose}>
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
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

                            {/* Optional Details Section (Date, Note & Delete) */}
                            <CollapsibleSection title="More options">
                                <FormDateInput label="Date" value={date} onChange={setDate} />
                                <FormDivider />
                                <FormTextArea
                                    label="Note"
                                    value={note}
                                    onChange={setNote}
                                    placeholder="Add details..."
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
                                        {isDeleting ? "Deleting..." : "Delete expense"}
                                    </span>
                                </button>
                            </CollapsibleSection>
                        </div>

                        {/* Bottom Action Buttons */}
                        <SheetActions
                            onCancel={onClose}
                            onSubmit={handleUpdate}
                            submitLabel="Save Changes"
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
