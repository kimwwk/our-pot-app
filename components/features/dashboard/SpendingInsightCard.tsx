"use client";

import { usePotStats } from "@/lib/data/hooks/usePotStats";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { formatCurrency } from "@/lib/utils/format";
import { parseLocalDate } from "@/lib/utils";

export function SpendingInsightCard() {
    const { stats, isLoading } = usePotStats();
    const { account } = useAccount();
    const currency = account?.currency || "GBP";

    // Calculate progress percentage (spent / funded)
    const progressPercent = stats.totalFunded > 0
        ? Math.min((stats.totalSpent / stats.totalFunded) * 100, 100)
        : 0;

    // Calculate daily average spending
    const calculateDailyAvg = () => {
        if (!stats.firstTransactionDate || !stats.lastTransactionDate || stats.totalSpent === 0) {
            return 0;
        }
        const first = parseLocalDate(stats.firstTransactionDate);
        const last = parseLocalDate(stats.lastTransactionDate);
        const daysDiff = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return Math.round(stats.totalSpent / daysDiff);
    };

    const dailyAvg = calculateDailyAvg();

    // Format date range
    const formatDateRange = () => {
        if (!stats.firstTransactionDate || !stats.lastTransactionDate) {
            return "No transactions yet";
        }
        const first = parseLocalDate(stats.firstTransactionDate);
        const last = parseLocalDate(stats.lastTransactionDate);
        const formatOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
        return `${first.toLocaleDateString("en-US", formatOptions)} - ${last.toLocaleDateString("en-US", formatOptions)}`;
    };

    return (
        <div className="w-full bg-card rounded-3xl p-5 border border-border shadow-xl relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 blur-[40px] rounded-full" />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-surface-lighter flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-sm">monitoring</span>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground leading-tight">Spending Insight</h3>
                            <p className="text-[10px] text-muted-foreground">
                                {isLoading ? "Loading..." : formatDateRange()}
                            </p>
                        </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-surface-lighter border border-border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                            Daily Avg{" "}
                            <span className="text-foreground ml-1">
                                {isLoading ? "--" : formatCurrency(dailyAvg, currency)}
                            </span>
                        </span>
                    </div>
                </div>

                <div className="flex items-end justify-between mb-2">
                    <div>
                        <span className="text-xs text-muted-foreground block mb-1">Total Spent</span>
                        <span className="text-xl font-bold text-destructive">
                            {isLoading ? "--" : `-${formatCurrency(stats.totalSpent, currency)}`}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-muted-foreground block mb-1">Total Funded</span>
                        <span className="text-sm font-bold text-primary">
                            {isLoading ? "--" : `+${formatCurrency(stats.totalFunded, currency)}`}
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden ring-1 ring-border">
                    <div
                        className="absolute left-0 top-0 bottom-0 bg-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">
                        {progressPercent.toFixed(0)}% of funds used
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {isLoading ? "--" : `${formatCurrency(stats.balance, currency)} remaining`}
                    </span>
                </div>
            </div>
        </div>
    );
}
