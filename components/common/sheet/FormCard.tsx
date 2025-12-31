"use client"

import { cn } from "@/lib/utils"

interface FormCardProps {
    children: React.ReactNode
    className?: string
}

/**
 * Rounded card container for form fields in sheets.
 * Provides consistent background and border radius.
 * Use FormFieldButton, FormTextInput inside as children.
 */
export function FormCard({ children, className }: FormCardProps) {
    return (
        <div className={cn("bg-muted/30 rounded-2xl overflow-hidden", className)}>
            {children}
        </div>
    )
}

/**
 * Horizontal divider between fields inside FormCard.
 */
export function FormDivider() {
    return <div className="h-px bg-background/60 mx-4" />
}
