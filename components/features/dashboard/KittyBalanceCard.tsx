"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils/format";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { cn } from "@/lib/utils";

interface KittyBalanceCardProps {
    className?: string;
}

export function KittyBalanceCard({ className }: KittyBalanceCardProps) {
    const { account, isLoading } = useAccount();
    const { db } = useSQLite();
    const [stats, setStats] = useState({ contributed: 0, spent: 0 });

    useEffect(() => {
        async function fetchStats() {
            if (!db || !account) return;

            try {
                const repo = new TransactionRepository(db);
                const transactions = await repo.getAllByAccount(account.id);

                const contributed = transactions
                    .filter(tx => tx.type === 'DEPOSIT')
                    .reduce((sum, tx) => sum + tx.amount, 0);

                const spent = Math.abs(transactions
                    .filter(tx => tx.type === 'EXPENSE')
                    .reduce((sum, tx) => sum + tx.amount, 0));

                setStats({ contributed, spent });
            } catch (error) {
                console.error("Failed to fetch balance stats:", error);
            }
        }

        fetchStats();
    }, [db, account]);

    if (isLoading || !account) {
        return (
            <div className={cn("relative flex flex-col items-center justify-center pt-8 pb-8", className)}>
                <div className="h-16 w-48 rounded bg-muted animate-pulse" />
            </div>
        );
    }

    // Format balance for display - split into main and decimal parts
    const formattedBalance = formatCurrency(account.balance, account.currency);
    const [mainPart, decimalPart] = formattedBalance.split('.');

    return (
        <div className={cn("relative flex flex-col items-center justify-center pt-8 pb-8", className)}>
            {/* Glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />

            {/* Balance */}
            <h1 className="relative z-10 text-[60px] font-extrabold tracking-tight text-foreground leading-none">
                {mainPart}
                {decimalPart && <span className="text-3xl text-muted-foreground font-bold">.{decimalPart}</span>}
            </h1>

            {/* Label */}
            <p className="text-muted-foreground text-sm font-medium mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Total Balance
            </p>
        </div>
    );
}
