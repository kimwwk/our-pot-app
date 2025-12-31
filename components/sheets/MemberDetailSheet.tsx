"use client"

import { useState, useEffect, useMemo } from "react"
import { Member, Transaction } from "@/lib/data/types"
import { AnimatedSheet } from "@/components/common/AnimatedSheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatCurrency } from "@/lib/utils/format"
import { useMemberStats } from "@/lib/data/hooks/useMemberStats"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { useSQLite } from "@/lib/data/contexts/SQLiteContext"
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository"
import { toast } from "sonner"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { SheetActions } from "@/components/common/sheet"
import { TransactionList } from "@/components/widgets/TransactionList"

interface MemberDetailSheetProps {
    member: Member | null
    isOpen: boolean
    onClose: () => void
}

export function MemberDetailSheet({ member, isOpen, onClose }: MemberDetailSheetProps) {
    const { account, reloadAccount } = useAccount()
    const { db } = useSQLite()
    const { contributed, owedByKitty, isLoading: statsLoading } = useMemberStats(member?.id)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isReimbursing, setIsReimbursing] = useState(false)
    const [loading, setLoading] = useState(false)

    // Only show last 5 transactions
    const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions])

    useEffect(() => {
        async function fetchTransactions() {
            if (!db || !account || !member) return

            setLoading(true)
            try {
                const repo = new TransactionRepository(db)
                const memberTransactions = await repo.getAllByAccount(account.id, {
                    memberId: member.id
                })
                setTransactions(memberTransactions)
            } catch (error) {
                console.error("Failed to fetch member transactions:", error)
            } finally {
                setLoading(false)
            }
        }

        if (isOpen && member) {
            fetchTransactions()
        }
    }, [db, account, member, isOpen])

    const handleReimburse = async () => {
        if (!db || !member || owedByKitty === 0) return

        setIsReimbursing(true)
        try {
            const repo = new TransactionRepository(db)
            const pendingTransactions = await repo.getPendingReimbursementsByMember(member.id)

            await Promise.all(
                pendingTransactions.map(tx =>
                    repo.updateStatus(tx.id, 'reimbursed')
                )
            )

            toast.success(`Reimbursed ${formatCurrency(owedByKitty, account?.currency || "GBP")} to ${member.name}`)

            // Refresh data
            const updatedTransactions = await repo.getAllByAccount(account!.id, {
                memberId: member.id
            })
            setTransactions(updatedTransactions)
            await reloadAccount()
        } catch (error) {
            console.error("Failed to reimburse member:", error)
            toast.error("Failed to process reimbursement")
        } finally {
            setIsReimbursing(false)
        }
    }

    if (!member) return null

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(word => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    const currency = account?.currency || "GBP"

    return (
        <AnimatedSheet isOpen={isOpen} onClose={onClose}>
            {/* Member Header */}
            <div className="py-6 flex flex-col items-center">
                <Avatar className="h-20 w-20 mb-3">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                        {getInitials(member.name)}
                    </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{member.name}</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4">
                {/* Stats Cards */}
                {statsLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {/* Contributed */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 p-4">
                            <div className="absolute top-3 right-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <TrendingDown className="h-4 w-4 text-green-600" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                                Contributed
                            </p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(contributed, currency)}
                            </p>
                        </div>

                        {/* To Reimburse */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-4">
                            <div className="absolute top-3 right-3">
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <TrendingUp className="h-4 w-4 text-amber-600" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                                To Reimburse
                            </p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {formatCurrency(owedByKitty, currency)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Recent Transactions */}
                <div className="mb-4">
                    <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 px-1">
                        Recent Activity
                    </h3>
                    <TransactionList
                        transactions={recentTransactions}
                        isLoading={loading}
                        showSearchBar={false}
                        showFilters={false}
                    />
                </div>
            </div>

            {/* Actions */}
            {owedByKitty > 0 ? (
                <SheetActions
                    onCancel={onClose}
                    onSubmit={handleReimburse}
                    submitLabel={`Reimburse ${formatCurrency(owedByKitty, currency)}`}
                    canSubmit={!isReimbursing}
                    isSubmitting={isReimbursing}
                    submittingLabel="Reimbursing..."
                />
            ) : (
                <div className="px-4 py-4">
                    <button
                        onClick={onClose}
                        className="w-full h-12 rounded-full bg-muted/50 text-foreground font-medium hover:bg-muted active:scale-[0.98] transition-all"
                    >
                        Close
                    </button>
                </div>
            )}
        </AnimatedSheet>
    )
}
