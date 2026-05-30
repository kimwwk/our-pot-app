"use client";

import { BottomNav } from "@/components/common/BottomNav"
import { PotSwitcher } from "@/components/common/PotSwitcher"
import { AnalyticsTracker } from "@/components/common/AnalyticsTracker"

export default function TabsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <AnalyticsTracker />
            {/* Header with PotSwitcher */}
            <header className="flex-none z-30 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] px-6">
                <div className="flex items-center justify-between">
                    <PotSwitcher />
                    <button className="h-10 w-10 flex items-center justify-center rounded-full bg-card text-muted-foreground hover:text-foreground ring-1 ring-border transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar pb-40">
                <div className="max-w-md mx-auto px-6">
                    {children}
                </div>
            </main>
            <BottomNav />
        </div>
    )
}
