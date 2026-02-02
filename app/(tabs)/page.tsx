"use client";

import { useState, useMemo } from "react";
import { KittyBalanceCard } from "@/components/features/dashboard/KittyBalanceCard";
import { QuickActions } from "@/components/features/dashboard/QuickActions";
import { SpendingInsightCard } from "@/components/features/dashboard/SpendingInsightCard";
import { MemberContributionsCard } from "@/components/features/dashboard/MemberContributionsCard";
import { AddExpenseSheet } from "@/components/sheets/AddExpenseSheet";
import { AddContributeSheet } from "@/components/sheets/AddContributeSheet";
import { EditExpenseSheet } from "@/components/sheets/EditExpenseSheet";
import { EditContributionSheet } from "@/components/sheets/EditContributionSheet";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { MemberRepository } from "@/lib/data/repositories/MemberRepository";
import { generateId } from "@/lib/utils/ulid";
import { toast } from "sonner";
import { TransactionList } from "@/components/features/transactions/TransactionList";
import { useTransactions } from "@/lib/data/hooks/useTransactions";
import { useRouter } from "next/navigation";

export default function HomePage() {
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showContribute, setShowContribute] = useState(false);
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const { db } = useSQLite();
    const { account, reloadAccount } = useAccount();
    const { transactions, isLoading, refetch } = useTransactions({ limit: 5 });
    const router = useRouter();

    const editingTransaction = useMemo(() => {
        if (!editingTransactionId) return null;
        return transactions.find(t => t.id === editingTransactionId);
    }, [editingTransactionId, transactions]);

    const handleAddExpense = async (data: any) => {
        if (!db || !account) return;

        try {
            const transactionRepo = new TransactionRepository(db);
            const memberRepo = new MemberRepository(db);

            const cents = Math.round(data.amount * 100);
            const member = await memberRepo.getById(data.memberId);
            const status = member?.is_kitty ? 'completed' : 'pending_reimbursement';

            await transactionRepo.create({
                id: generateId(),
                account_id: account.id,
                member_id: data.memberId,
                category_id: data.categoryId,
                type: "EXPENSE",
                amount: Math.abs(cents),
                merchant: data.description,
                description: data.description,
                note: data.note,
                date: data.date,
                status: status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            toast.success("Expense added");
            await reloadAccount();
            refetch();
        } catch (err) {
            console.error(err);
            toast.error("Failed to add expense");
        }
    };

    const handleTransactionUpdated = () => {
        reloadAccount();
        refetch();
    };

    return (
        <div className="space-y-6 pt-4">
            {/* Hero Balance */}
            <KittyBalanceCard />

            {/* Spending Insight */}
            <SpendingInsightCard />

            {/* Quick Actions Grid */}
            <QuickActions
                onAddExpense={() => setShowAddExpense(true)}
                onContribute={() => setShowContribute(true)}
                onAskAgent={() => router.push('/agent')}
            />

            {/* Members */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                        Members
                    </h3>
                </div>
                <MemberContributionsCard />
            </div>

            {/* Recent Activity */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                        Recent Activity
                    </h3>
                    <button
                        onClick={() => router.push('/transactions')}
                        className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                        View All
                    </button>
                </div>
                <TransactionList
                    transactions={transactions.slice(0, 5)}
                    isLoading={isLoading}
                    onTransactionClick={(id) => setEditingTransactionId(id)}
                    showSearchBar={false}
                    showFilters={false}
                />
            </div>

            {/* Sheets */}
            <AddExpenseSheet
                isOpen={showAddExpense}
                onClose={() => setShowAddExpense(false)}
                onSubmit={handleAddExpense}
            />

            <AddContributeSheet
                isOpen={showContribute}
                onClose={() => setShowContribute(false)}
            />

            {editingTransaction?.type === "EXPENSE" && (
                <EditExpenseSheet
                    transactionId={editingTransactionId}
                    isOpen={!!editingTransactionId}
                    onClose={() => setEditingTransactionId(null)}
                    onSuccess={handleTransactionUpdated}
                />
            )}

            {editingTransaction?.type === "DEPOSIT" && (
                <EditContributionSheet
                    transactionId={editingTransactionId}
                    isOpen={!!editingTransactionId}
                    onClose={() => setEditingTransactionId(null)}
                    onSuccess={handleTransactionUpdated}
                />
            )}
        </div>
    );
}
