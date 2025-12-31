"use client"

import { ReactNode, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedSheetProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    headerAction?: ReactNode
    children: React.ReactNode
    className?: string
    /** Max height of sheet, default 90vh */
    maxHeight?: string
}

/**
 * PREFERRED: Modern animated bottom sheet with framer-motion.
 *
 * Use this for all new sheets. It provides:
 * - Smooth spring animations via framer-motion
 * - Proper z-index stacking (z-[100]/[101]) that covers bottom nav
 * - Portal rendering to document.body for correct overlay behavior
 * - Support for nested overlays (numpad, pickers) at higher z-index
 * - Escape key and backdrop click to close
 * - Body scroll lock when open
 *
 * For building sheet content, use the composable components in:
 * @see components/common/sheet/AmountHero.tsx
 * @see components/common/sheet/FormCard.tsx
 * @see components/common/sheet/FormFieldButton.tsx
 * @see components/common/sheet/CollapsibleSection.tsx
 * @see components/common/sheet/SheetActions.tsx
 *
 * Legacy sheets using BaseSheet should migrate to this component.
 * BaseSheet uses Radix which has limited animation control and z-index issues.
 */
export function AnimatedSheet({
    isOpen,
    onClose,
    title,
    headerAction,
    children,
    className,
    maxHeight = "90vh"
}: AnimatedSheetProps) {
    // Prevent body scroll when sheet is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
            return () => {
                document.body.style.overflow = ""
            }
        }
    }, [isOpen])

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose()
            }
        }

        document.addEventListener("keydown", handleEscape)
        return () => document.removeEventListener("keydown", handleEscape)
    }, [isOpen, onClose])

    // Use portal to render at document root
    if (typeof window === "undefined") return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[100]"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Sheet */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={title ? "sheet-title" : undefined}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 380 }}
                        className={cn(
                            "fixed bottom-0 left-0 right-0 bg-background z-[101] flex flex-col",
                            className
                        )}
                        style={{
                            borderRadius: "24px 24px 0 0",
                            maxHeight
                        }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                        </div>

                        {/* Header */}
                        {(title || headerAction) && (
                            <div className="px-5 pb-4 pt-1 flex items-center justify-between">
                                {headerAction ? <div className="w-10" /> : null}
                                {title && (
                                    <h2
                                        id="sheet-title"
                                        className={cn(
                                            "text-lg font-semibold",
                                            headerAction ? "text-center flex-1" : ""
                                        )}
                                    >
                                        {title}
                                    </h2>
                                )}
                                {headerAction && (
                                    <div className="w-10 flex justify-end">
                                        {headerAction}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Content */}
                        {children}

                        {/* Bottom safe area */}
                        <div className="pb-safe" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}
