"use client"

import { useState } from "react"
import { ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CategoryPickerCategory {
    id: string
    name: string
    icon?: string
}

interface CategoryPickerProps {
    categories: CategoryPickerCategory[]
    selectedCategoryId: string
    onSelect: (categoryId: string) => void
    placeholder?: string
    className?: string
}

export function CategoryPicker({
    categories,
    selectedCategoryId,
    onSelect,
    placeholder = "Select category",
    className,
}: CategoryPickerProps) {
    const [isOpen, setIsOpen] = useState(false)

    const selectedCategory = categories.find(c => c.id === selectedCategoryId)

    const handleSelect = (categoryId: string) => {
        onSelect(categoryId)
        setIsOpen(false)
    }

    return (
        <div className={cn("space-y-2", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-4 flex items-center justify-between border-b border-border/60 text-left"
                type="button"
            >
                <div>
                    <span className="text-xs text-muted-foreground block mb-1">Category</span>
                    {selectedCategory ? (
                        <span className="text-base font-medium flex items-center gap-2">
                            <span>{selectedCategory.icon || '📦'}</span>
                            {selectedCategory.name}
                        </span>
                    ) : (
                        <span className="text-base text-muted-foreground/50">{placeholder}</span>
                    )}
                </div>
                <ChevronRight className={cn("h-5 w-5 text-muted-foreground/40 transition-transform", isOpen && "rotate-90")} />
            </button>

            {isOpen && (
                <div className="grid grid-cols-3 gap-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleSelect(cat.id)}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-xl transition-all active:scale-95",
                                selectedCategoryId === cat.id
                                    ? "bg-foreground text-background"
                                    : "bg-muted/40 hover:bg-muted/60"
                            )}
                            type="button"
                        >
                            <span className="text-2xl">{cat.icon || '📦'}</span>
                            <span className="text-xs font-medium text-center leading-tight">{cat.name}</span>
                            {selectedCategoryId === cat.id && (
                                <Check className="h-4 w-4 absolute top-2 right-2" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
