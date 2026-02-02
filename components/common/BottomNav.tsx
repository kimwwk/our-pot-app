"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
    {
        name: "Home",
        href: "/",
        icon: "home",
    },
    {
        name: "Transactions",
        href: "/transactions",
        icon: "receipt_long",
    },
    {
        name: "Agent",
        href: "/agent",
        icon: "smart_toy",
    },
    {
        name: "Settings",
        href: "/settings",
        icon: "settings",
    },
]

export function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border px-6 pb-8 pt-4">
            <div className="flex items-center justify-between max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group flex flex-col items-center gap-1 min-w-[64px]"
                        >
                            <div
                                className={cn(
                                    "flex h-10 w-16 items-center justify-center rounded-full transition-colors",
                                    isActive
                                        ? "bg-primary/10"
                                        : "bg-transparent group-hover:bg-muted"
                                )}
                            >
                                <span
                                    className={cn(
                                        "material-symbols-outlined transition-colors",
                                        isActive
                                            ? "text-primary filled"
                                            : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                    style={{ fontSize: "24px" }}
                                >
                                    {item.icon}
                                </span>
                            </div>
                            <span
                                className={cn(
                                    "text-[11px] transition-colors",
                                    isActive
                                        ? "font-bold text-foreground"
                                        : "font-medium text-muted-foreground group-hover:text-foreground"
                                )}
                            >
                                {item.name}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
