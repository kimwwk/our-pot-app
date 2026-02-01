"use client";

import { toast } from "sonner";

interface QuickActionsProps {
    onAddExpense?: () => void;
    onContribute?: () => void;
    onAskAgent?: () => void;
}

export function QuickActions({ onAddExpense, onContribute, onAskAgent }: QuickActionsProps) {
    const handleComingSoon = (feature: string) => {
        toast.info(`${feature} coming soon!`);
    };

    return (
        <div className="grid grid-cols-3 gap-3">
            {/* Pay In (Contribute) */}
            <button
                onClick={onContribute}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-card border border-border active:scale-95 transition-all hover:bg-surface-lighter group shadow-lg"
            >
                <div className="h-12 w-12 rounded-full bg-surface-lighter flex items-center justify-center text-primary border border-border group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(19,236,91,0.3)] transition-all">
                    <span className="material-symbols-outlined">add</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">Pay In</span>
            </button>

            {/* Pay Out (Expense) */}
            <button
                onClick={onAddExpense}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-card border border-border active:scale-95 transition-all hover:bg-surface-lighter group shadow-lg"
            >
                <div className="h-12 w-12 rounded-full bg-surface-lighter flex items-center justify-center text-foreground border border-border group-hover:border-foreground/20 transition-all">
                    <span className="material-symbols-outlined">remove</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">Pay Out</span>
            </button>

            {/* Speak (Voice Input - Coming Soon) */}
            <button
                onClick={() => handleComingSoon("Voice input")}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-card border border-border active:scale-95 transition-all hover:bg-surface-lighter group shadow-lg"
            >
                <div className="h-12 w-12 rounded-full bg-surface-lighter flex items-center justify-center text-primary border border-border group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(19,236,91,0.3)] transition-all">
                    <span className="material-symbols-outlined">mic</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">Speak</span>
            </button>
        </div>
    );
}
