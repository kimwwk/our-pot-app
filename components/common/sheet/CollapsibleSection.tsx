"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
    /** Title shown in collapsed state and header */
    title?: string
    /** Whether section should start expanded */
    defaultExpanded?: boolean
    /** Control expanded state externally */
    expanded?: boolean
    /** Callback when expanded state changes */
    onExpandedChange?: (expanded: boolean) => void
    /** Force show expanded (e.g., when fields have values) */
    forceExpanded?: boolean
    children: React.ReactNode
    className?: string
}

/**
 * Collapsible "More options" section for sheets.
 * Shows a "+ Title" button when collapsed, expands to show children.
 * Header is tappable to collapse again.
 *
 * @example
 * <CollapsibleSection title="More options" forceExpanded={hasNote}>
 *   <FormDateInput label="Date" ... />
 *   <FormDivider />
 *   <FormTextArea label="Note" ... />
 * </CollapsibleSection>
 */
export function CollapsibleSection({
    title = "More options",
    defaultExpanded = false,
    expanded: controlledExpanded,
    onExpandedChange,
    forceExpanded = false,
    children,
    className
}: CollapsibleSectionProps) {
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)

    const isControlled = controlledExpanded !== undefined
    const isExpanded = forceExpanded || (isControlled ? controlledExpanded : internalExpanded)

    const toggle = () => {
        if (forceExpanded) return // Can't collapse if forced
        const newValue = !isExpanded
        if (isControlled) {
            onExpandedChange?.(newValue)
        } else {
            setInternalExpanded(newValue)
        }
    }

    return (
        <div className={cn("mt-3 mb-4", className)}>
            {!isExpanded ? (
                <button
                    onClick={toggle}
                    className="flex items-center gap-2 text-[13px] text-primary/70 hover:text-primary transition-colors py-2"
                    type="button"
                >
                    <Plus className="h-4 w-4" />
                    {title}
                </button>
            ) : (
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-muted/30 rounded-2xl overflow-hidden"
                    >
                        {/* Collapse Header */}
                        <button
                            onClick={toggle}
                            className="w-full px-4 py-2.5 flex items-center justify-between text-left"
                            type="button"
                            disabled={forceExpanded}
                        >
                            <span className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-medium">
                                {title}
                            </span>
                            {!forceExpanded && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground/30 rotate-90" />
                            )}
                        </button>

                        <div className="h-px bg-background/60 mx-4" />

                        {children}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    )
}
