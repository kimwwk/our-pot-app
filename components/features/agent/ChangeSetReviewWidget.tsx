"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useChangeSet } from "@/lib/data/contexts/ChangeSetContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { CategoryRepository } from "@/lib/data/repositories/CategoryRepository";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface ChangeSetReviewWidgetProps {
  onApprove: () => void;
  onReject: (feedback?: string) => void;
  onDiscard: () => void;
  onModifyRequest: (message: string) => void;
}

interface ParsedChange {
  id: string;
  operation: string;
  entity: string;
  proposedData: any;
  currentData: any;
  categoryName?: string;
  currentCategoryName?: string;
}

// Map category names to icons
const getCategoryIcon = (categoryName?: string): string => {
  const iconMap: Record<string, string> = {
    "Food & Drink": "restaurant",
    "Groceries": "shopping_cart",
    "Transport": "local_taxi",
    "Entertainment": "local_bar",
    "Shopping": "shopping_bag",
    "Bills": "receipt_long",
    "Health": "medical_services",
    "Travel": "flight",
  };
  return iconMap[categoryName || ""] || "payments";
};

export function ChangeSetReviewWidget({ onApprove, onReject, onDiscard, onModifyRequest }: ChangeSetReviewWidgetProps) {
  const { getBufferAsArray, metadata } = useChangeSet();
  const { db } = useSQLite();
  const { account } = useAccount();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [modifyMessage, setModifyMessage] = useState("");
  const [parsedChanges, setParsedChanges] = useState<ParsedChange[]>([]);

  const changes = useMemo(() => getBufferAsArray(), [getBufferAsArray]);

  // Parse changes and look up category names
  useEffect(() => {
    async function parseChanges() {
      if (!db || !account) return;

      const categoryRepo = new CategoryRepository(db);
      const categories = await categoryRepo.getAllByAccount(account.id);
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      const parsed = changes.map(change => {
        const proposedData = change.proposedData;
        const currentData = change.currentData;
        const categoryName = proposedData?.category_id ? categoryMap.get(proposedData.category_id as string) : undefined;
        const currentCategoryName = currentData?.category_id ? categoryMap.get(currentData.category_id as string) : undefined;

        return {
          id: change.id,
          operation: change.operationType,
          entity: change.entityType,
          proposedData,
          currentData,
          categoryName,
          currentCategoryName,
        };
      });

      setParsedChanges(parsed);
    }

    parseChanges();
  }, [changes, db, account]);

  if (changes.length === 0) return null;

  const handleModifySubmit = () => {
    if (modifyMessage.trim()) {
      onModifyRequest(modifyMessage);
      setModifyMessage("");
      setShowModifyInput(false);
    }
  };

  // Separate transactions and categories
  const transactions = parsedChanges.filter(c => c.entity === "transaction");
  const categories = parsedChanges.filter(c => c.entity === "category");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
          <span className="material-symbols-outlined">auto_awesome</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-foreground text-sm">{metadata?.title || "AI Proposal"}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-bold">
              {parsedChanges.length} {parsedChanges.length === 1 ? 'change' : 'changes'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Review and approve to apply</p>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
          <span className="material-symbols-outlined text-muted-foreground">keyboard_arrow_down</span>
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Description */}
            {metadata?.description && (
              <div className="px-4 pb-3">
                <div className="rounded-xl bg-muted/50 p-3 border border-border">
                  <p className="text-sm text-foreground leading-relaxed">{metadata.description}</p>
                </div>
              </div>
            )}

            {/* Categories to Create */}
            {categories.length > 0 && (
              <div className="px-4 pb-3">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2 pl-1">
                  Categories to Create
                </h4>
                <div className="space-y-2">
                  {categories.map((change) => (
                    <div key={change.id} className="bg-muted/30 rounded-xl p-3 flex items-center gap-3 border border-border">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-sm">new_label</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-foreground">{change.proposedData?.name}</span>
                        <p className="text-[10px] text-muted-foreground">New Category</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions */}
            {transactions.length > 0 && (
              <div className="px-4 pb-3">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2 pl-1">
                  Transactions
                </h4>
                <div className="space-y-2">
                  {transactions.map((change, index) => (
                    <motion.div
                      key={change.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-muted/30 rounded-xl p-3 flex items-center justify-between border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-sm">{getCategoryIcon(change.categoryName)}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">
                            {change.proposedData?.description || change.proposedData?.merchant || "Transaction"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {change.categoryName || "Uncategorized"}
                          </div>
                        </div>
                      </div>
                      <div className="text-primary font-bold text-sm">
                        {formatCurrency(change.proposedData?.amount || 0, account?.currency || "GBP")}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Modify input */}
            <AnimatePresence mode="wait">
              {showModifyInput && (
                <motion.div
                  key="modify-input"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 pb-3"
                >
                  <div className="rounded-xl bg-muted p-3">
                    <textarea
                      value={modifyMessage}
                      onChange={(e) => setModifyMessage(e.target.value)}
                      placeholder="Tell the AI what to change..."
                      className="w-full text-sm bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground leading-relaxed"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowModifyInput(false)}
                        className="rounded-lg"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleModifySubmit}
                        disabled={!modifyMessage.trim()}
                        className="rounded-lg"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons - Previous structure */}
            <div className="p-4 border-t border-border space-y-2">
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                  onClick={onApprove}
                >
                  <span className="material-symbols-outlined mr-2 text-sm">check</span>
                  Approve
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 h-9 rounded-lg text-muted-foreground text-sm"
                  onClick={() => setShowModifyInput(true)}
                >
                  <span className="material-symbols-outlined mr-1.5 text-sm">chat_bubble</span>
                  Request Changes
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={onDiscard}
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
