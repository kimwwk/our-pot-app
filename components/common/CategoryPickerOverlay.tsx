"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CategoryPickerCategory {
    id: string
    name: string
    icon?: string
}

interface CategoryPickerOverlayProps {
    isOpen: boolean
    onClose: () => void
    categories: CategoryPickerCategory[]
    selectedCategoryId: string
    onSelect: (categoryId: string) => void
}

export function CategoryPickerOverlay({
    isOpen,
    onClose,
    categories,
    selectedCategoryId,
    onSelect,
}: CategoryPickerOverlayProps) {
    const handleSelect = (categoryId: string) => {
        onSelect(categoryId)
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[105]"
                        onClick={onClose}
                    />

                    {/* Overlay Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 380 }}
                        className="fixed bottom-0 left-0 right-0 bg-background z-[110] flex flex-col"
                        style={{ borderRadius: "24px 24px 0 0", maxHeight: "75vh" }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
                            <button
                                onClick={onClose}
                                className="text-sm text-muted-foreground font-medium"
                                type="button"
                            >
                                Cancel
                            </button>
                            <span className="text-base font-semibold">Category</span>
                            <div className="w-14" />
                        </div>

                        {/* Category Grid */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-3 gap-3">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleSelect(cat.id)}
                                        className={cn(
                                            "relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95",
                                            selectedCategoryId === cat.id
                                                ? "bg-foreground text-background shadow-lg"
                                                : "bg-muted/40 hover:bg-muted/60"
                                        )}
                                        type="button"
                                    >
                                        <span className="text-3xl">{cat.icon || '📦'}</span>
                                        <span className="text-xs font-medium text-center leading-tight">
                                            {cat.name}
                                        </span>
                                        {selectedCategoryId === cat.id && (
                                            <div className="absolute top-2 right-2">
                                                <Check className="h-4 w-4" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pb-safe" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
