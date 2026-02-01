"use client";

import { useMemberContributions } from "@/lib/data/hooks/useMemberContributions";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/common/EmptyState";
import { Users } from "lucide-react";

export function MemberContributionsCard() {
    const { members, isLoading } = useMemberContributions();
    const { account } = useAccount();
    const currency = account?.currency || "GBP";

    if (isLoading) {
        return (
            <div className="bg-card rounded-2xl p-4 border border-border">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-14 bg-muted rounded" />
                    <div className="h-14 bg-muted rounded" />
                </div>
            </div>
        );
    }

    if (members.length === 0) {
        return (
            <EmptyState
                icon={Users}
                title="No Members Yet"
                description="Add household members to start tracking contributions and shared expenses"
            />
        );
    }

    const lowFundsMembers = members.filter(m => m.isLowOnFunds);
    const healthyMembers = members.filter(m => !m.isLowOnFunds);
    const maxContribution = Math.max(...members.map(m => m.totalContributed), 1);

    return (
        <div className="space-y-3">
            {/* Low Funds Warning Cards */}
            {lowFundsMembers.map((member, index) => (
                <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative overflow-hidden rounded-2xl bg-card p-4 shadow-md ring-1 ring-border"
                >
                    {/* Warning accent bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning group-hover:w-1.5 transition-all" />

                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center text-warning font-bold shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-foreground truncate">
                                        {member.name}
                                    </span>
                                    <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded uppercase">
                                        Low
                                    </span>
                                </div>
                                <span className={cn(
                                    "text-sm font-bold",
                                    member.balance < 0 ? "text-destructive" : "text-warning"
                                )}>
                                    {member.balance < 0 ? "-" : ""}{formatCurrency(Math.abs(member.balance), currency)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {member.pendingReimbursement > 0
                                    ? `${member.pendingDescription || `Owes ${formatCurrency(member.pendingReimbursement, currency)}`}`
                                    : "Needs to top up"
                                }
                            </p>
                        </div>

                        {/* Action button */}
                        <button className="h-8 px-3 rounded-lg bg-surface-lighter hover:bg-muted text-[10px] font-bold text-foreground transition-colors border border-border uppercase tracking-wide shrink-0">
                            Nudge
                        </button>
                    </div>
                </motion.div>
            ))}

            {/* Healthy Members Card */}
            {healthyMembers.length > 0 && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    {healthyMembers.map((member, index) => {
                        const progressPercent = (member.totalContributed / maxContribution) * 100;

                        return (
                            <motion.div
                                key={member.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: (lowFundsMembers.length + index) * 0.05 }}
                                className={cn(
                                    "px-4 py-3 flex items-center gap-3",
                                    index !== healthyMembers.length - 1 && "border-b border-border"
                                )}
                            >
                                {/* Avatar */}
                                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Name and Progress */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-foreground truncate">
                                            {member.name}
                                        </span>
                                        <span className="text-sm font-bold text-primary">
                                            {formatCurrency(member.totalContributed, currency)}
                                        </span>
                                    </div>

                                    {/* Progress bar and status */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary/60 rounded-full transition-all"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                        {member.pendingReimbursement > 0 && (
                                            <span className="text-[10px] text-warning font-medium shrink-0">
                                                Owes {formatCurrency(member.pendingReimbursement, currency)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
