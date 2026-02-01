"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { formatCurrency } from "@/lib/utils/format";
import { useMembers } from "@/lib/data/hooks/useMembers";
import { PotSheet } from "@/components/sheets/PotSheet";
import { createPot } from "@/lib/data/actions/createPot";
import { toast } from "sonner";

export function PotSwitcher() {
    const { account, accounts, switchAccount } = useAccount();
    const { db } = useSQLite();
    const { members } = useMembers();
    const [isOpen, setIsOpen] = useState(false);
    const [showPotSheet, setShowPotSheet] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    if (!account) return null;

    const handlePotChange = async (id: string) => {
        await switchAccount(id);
        setIsOpen(false);
    };

    const handleCreatePot = async (data: { name: string; emoji: string; currency: string }) => {
        if (!db) return;

        setIsCreating(true);
        try {
            const result = await createPot(db, data);

            // Switch to the new pot
            await switchAccount(result.accountId);

            setShowPotSheet(false);
            setIsOpen(false);
            toast.success(`${data.name} created!`);
        } catch (error) {
            console.error('Failed to create pot:', error);
            toast.error('Failed to create pot');
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenCreateSheet = () => {
        setShowPotSheet(true);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 rounded-full bg-card pl-2 pr-4 py-1.5 ring-1 ring-border active:scale-95 transition-all hover:ring-primary/30 group"
            >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                        savings
                    </span>
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider leading-none mb-0.5">
                        Current Pot
                    </span>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-foreground">{account.name}</span>
                        <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="material-symbols-outlined text-muted-foreground"
                            style={{ fontSize: "18px" }}
                        >
                            keyboard_arrow_down
                        </motion.span>
                    </div>
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown menu */}
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-card border border-border shadow-xl z-50 overflow-hidden"
                        >
                            <div className="p-2">
                                <p className="text-[10px] font-bold text-muted-foreground px-3 py-2 uppercase tracking-wider">
                                    Switch Pot
                                </p>

                                {accounts.map((pot) => {
                                    const memberCount = members.filter(m => m.account_id === pot.id).length;
                                    const isActive = pot.id === account.id;

                                    return (
                                        <button
                                            key={pot.id}
                                            onClick={() => handlePotChange(pot.id)}
                                            className={`flex items-center gap-3 w-full rounded-xl p-3 transition-all ${
                                                isActive
                                                    ? "bg-primary/10 ring-1 ring-primary/20"
                                                    : "hover:bg-muted"
                                            }`}
                                        >
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg ${
                                                isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                                            }`}>
                                                {pot.emoji}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-bold text-sm text-foreground">{pot.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatCurrency(pot.balance, pot.currency)} · {memberCount} members
                                                </p>
                                            </div>
                                            {isActive && (
                                                <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>
                                                    check_circle
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="border-t border-border p-2">
                                <button
                                    onClick={handleOpenCreateSheet}
                                    className="flex items-center gap-3 w-full rounded-xl p-3 hover:bg-muted transition-colors text-muted-foreground group"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 transition-colors">
                                        <span className="material-symbols-outlined text-muted-foreground group-hover:text-primary" style={{ fontSize: "20px" }}>
                                            add
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold group-hover:text-foreground transition-colors">Create New Pot</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Create Pot Sheet */}
            <PotSheet
                isOpen={showPotSheet}
                onClose={() => setShowPotSheet(false)}
                onSubmit={handleCreatePot}
                isSubmitting={isCreating}
            />
        </div>
    );
}
