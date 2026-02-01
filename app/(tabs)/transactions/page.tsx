"use client";

import { useState, useMemo } from "react";
import { TransactionList } from "@/components/features/transactions/TransactionList";
import { MonthSlider } from "@/components/features/transactions/MonthSlider";
import { useTransactions } from "@/lib/data/hooks/useTransactions";
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
import { parseLocalDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";

export default function TransactionsPage() {
    const { transactions, isLoading, refetch } = useTransactions({ limit: 200 });
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const { db } = useSQLite();
    const { account, reloadAccount } = useAccount();

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showContribute, setShowContribute] = useState(false);
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

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

    // Filter transactions by selected month
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const transactionDate = parseLocalDate(t.date);
            return (
                transactionDate.getFullYear() === selectedMonth.getFullYear() &&
                transactionDate.getMonth() === selectedMonth.getMonth()
            );
        });
    }, [transactions, selectedMonth]);

    // Calculate month stats
    const monthStats = useMemo(() => {
        let spent = 0;
        let funded = 0;

        filteredTransactions.forEach(t => {
            if (t.type === 'EXPENSE') {
                spent += Math.abs(t.amount);
            } else if (t.type === 'DEPOSIT') {
                funded += t.amount;
            }
        });

        return { spent, funded, balance: funded - spent };
    }, [filteredTransactions]);

    return (
        <div className="space-y-0">
            {/* Month Slider */}
            <MonthSlider
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
            />

            {/* Summary Stats Bar */}
            <div className="bg-card border-y border-border">
                <div className="flex divide-x divide-border">
                    <div className="flex-1 py-3 px-4 flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                            Spent
                        </span>
                        <span className="text-sm font-bold text-destructive">
                            -{formatCurrency(monthStats.spent, account?.currency || "GBP")}
                        </span>
                    </div>
                    <div className="flex-1 py-3 px-4 flex flex-col items-center justify-center bg-muted/30">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                            Funded
                        </span>
                        <span className="text-sm font-bold text-primary">
                            +{formatCurrency(monthStats.funded, account?.currency || "GBP")}
                        </span>
                    </div>
                    <div className="flex-1 py-3 px-4 flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                            Balance
                        </span>
                        <span className="text-sm font-bold text-foreground">
                            {formatCurrency(monthStats.balance, account?.currency || "GBP")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="pt-4">
                <TransactionList
                    transactions={filteredTransactions}
                    isLoading={isLoading}
                    onTransactionClick={(id) => setEditingTransactionId(id)}
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
                onSuccess={handleTransactionUpdated}
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
