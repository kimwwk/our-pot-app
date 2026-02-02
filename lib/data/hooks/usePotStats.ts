"use client";

import { useEffect, useState, useCallback } from "react";
import { useSQLite } from "../contexts/SQLiteContext";
import { useAccount } from "../contexts/AccountContext";
import { TransactionRepository } from "../repositories/TransactionRepository";

interface PotStats {
    totalSpent: number;
    totalFunded: number;
    balance: number;
    firstTransactionDate: string | null;
    lastTransactionDate: string | null;
}

// TODO: Optimize this hook - consider caching or memoization for better performance
export function usePotStats() {
    const { db } = useSQLite();
    const { account } = useAccount();
    const [stats, setStats] = useState<PotStats>({
        totalSpent: 0,
        totalFunded: 0,
        balance: 0,
        firstTransactionDate: null,
        lastTransactionDate: null,
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        if (!db || !account) return;

        try {
            setIsLoading(true);
            const repo = new TransactionRepository(db);
            const data = await repo.getPotLevelStats(account.id);
            setStats({
                ...data,
                balance: data.totalFunded - data.totalSpent,
            });
        } catch (err) {
            console.error("Failed to fetch pot stats:", err);
        } finally {
            setIsLoading(false);
        }
    }, [db, account]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, isLoading, refetch: fetchStats };
}
