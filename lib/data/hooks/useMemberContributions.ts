"use client";

import { useEffect, useState, useCallback } from "react";
import { useSQLite } from "../contexts/SQLiteContext";
import { useAccount } from "../contexts/AccountContext";
import { MemberRepository } from "../repositories/MemberRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { Member } from "../types";

export interface MemberWithStats extends Member {
    totalContributed: number;
    pendingReimbursement: number;
    pendingDescription?: string; // e.g., "Owes £45 for groceries"
    isLowOnFunds: boolean;
    balance: number; // contribution - pending reimbursements
}

export function useMemberContributions() {
    const { db } = useSQLite();
    const { account } = useAccount();
    const [members, setMembers] = useState<MemberWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [averageContribution, setAverageContribution] = useState(0);

    const fetchMemberContributions = useCallback(async () => {
        if (!db || !account) return;

        try {
            setIsLoading(true);
            const memberRepo = new MemberRepository(db);
            const transactionRepo = new TransactionRepository(db);

            const allMembers = await memberRepo.getAllByAccount(account.id);
            const contributions = await transactionRepo.getMemberContributions(account.id);

            // Create a map of memberId -> totalContributed
            const contributionMap = new Map<string, number>();
            contributions.forEach(c => {
                contributionMap.set(c.memberId, c.totalContributed);
            });

            // Get pending reimbursements for each member
            const membersWithStats: MemberWithStats[] = [];

            for (const member of allMembers) {
                if (member.is_kitty) continue;

                const totalContributed = contributionMap.get(member.id) || 0;
                const pendingReimbursement = await transactionRepo.getOwedByMember(member.id);

                // Get the most recent pending transaction for description
                let pendingDescription: string | undefined;
                if (pendingReimbursement > 0) {
                    const pendingTransactions = await transactionRepo.getPendingReimbursementsByMember(member.id);
                    if (pendingTransactions.length > 0) {
                        const latest = pendingTransactions[0];
                        pendingDescription = `Owes ${latest.description || latest.merchant || 'expense'}`;
                    }
                }

                const balance = totalContributed - pendingReimbursement;

                membersWithStats.push({
                    ...member,
                    totalContributed,
                    pendingReimbursement,
                    pendingDescription,
                    balance,
                    isLowOnFunds: false, // Will be set after calculating average
                });
            }

            // Calculate average contribution
            const total = membersWithStats.reduce((sum, m) => sum + m.totalContributed, 0);
            const avg = membersWithStats.length > 0 ? total / membersWithStats.length : 0;

            // Mark members as low on funds if below average or negative balance
            membersWithStats.forEach(m => {
                m.isLowOnFunds = m.totalContributed < avg * 0.5 || m.balance < 0;
            });

            // Sort: low funds first, then by contribution descending
            membersWithStats.sort((a, b) => {
                if (a.isLowOnFunds && !b.isLowOnFunds) return -1;
                if (!a.isLowOnFunds && b.isLowOnFunds) return 1;
                return b.totalContributed - a.totalContributed;
            });

            setMembers(membersWithStats);
            setAverageContribution(avg);
        } catch (err) {
            console.error("Failed to fetch member contributions:", err);
        } finally {
            setIsLoading(false);
        }
    }, [db, account]);

    useEffect(() => {
        fetchMemberContributions();
    }, [fetchMemberContributions]);

    return { members, isLoading, averageContribution, refetch: fetchMemberContributions };
}
