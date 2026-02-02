"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useMembers } from "@/lib/data/hooks/useMembers";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils/format";

export function ToReimburseCard() {
  const { members } = useMembers();
  const { account } = useAccount();
  const { db } = useSQLite();
  const [totalOwed, setTotalOwed] = useState(0);
  const [membersOwingCount, setMembersOwingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const humanMembers = useMemo(() => members.filter(m => !m.is_kitty), [members]);

  useEffect(() => {
    async function calculateTotalOwed() {
      if (!db || !account || humanMembers.length === 0) {
        setTotalOwed(0);
        setMembersOwingCount(0);
        setIsLoading(false);
        return;
      }

      try {
        const repo = new TransactionRepository(db);
        let total = 0;
        let count = 0;

        for (const member of humanMembers) {
          const owed = await repo.getOwedByMember(member.id);
          if (owed > 0) {
            total += owed;
            count++;
          }
        }

        setTotalOwed(total);
        setMembersOwingCount(count);
      } catch (error) {
        console.error("Failed to calculate total owed:", error);
        setTotalOwed(0);
        setMembersOwingCount(0);
      } finally {
        setIsLoading(false);
      }
    }

    calculateTotalOwed();
  }, [db, account, humanMembers]);

  if (isLoading) {
    return null;
  }

  const hasAmount = totalOwed > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl bg-card p-4 shadow-md ring-1 ring-border active:scale-[0.98] transition-all"
    >
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${hasAmount ? "bg-warning" : "bg-muted-foreground/20"} group-hover:w-1.5 transition-all`} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
            hasAmount ? "bg-warning/10" : "bg-muted"
          }`}>
            <span className={`material-symbols-outlined text-lg ${
              hasAmount ? "text-warning" : "text-muted-foreground"
            }`}>
              receipt_long
            </span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              {hasAmount
                ? `${membersOwingCount} Reimbursement${membersOwingCount > 1 ? 's' : ''} Pending`
                : "No Pending Reimbursements"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasAmount
                ? `Total: ${formatCurrency(totalOwed, account?.currency || "GBP")}`
                : "All members are settled up"}
            </p>
          </div>
        </div>
        {hasAmount && (
          <button className="h-8 w-8 rounded-full bg-surface-lighter hover:bg-muted flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-muted-foreground" style={{ fontSize: "16px" }}>
              arrow_forward
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
