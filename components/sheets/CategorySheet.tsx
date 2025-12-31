"use client"

import { useState, useEffect } from "react"
import { AnimatedSheet } from "@/components/common/AnimatedSheet"
import {
    FormCard,
    FormTextInput,
    FormDivider,
    SheetActions
} from "@/components/common/sheet"
import { cn } from "@/lib/utils"
import { Category } from "@/lib/data/types"

interface CategorySheetProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (category: { name: string; icon: string; color: string }) => void
    /** Pass category to edit, or undefined for add mode */
    category?: Category | null
}

const CATEGORY_ICONS = [
    "🛒", "🍔", "🚗", "🏠", "💡", "🎮", "👕", "💊",
    "🎬", "✈️", "📱", "🎁", "🐕", "💇", "📚", "⚽",
]

const CATEGORY_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
]

export function CategorySheet({ isOpen, onClose, onSubmit, category }: CategorySheetProps) {
    const [name, setName] = useState("")
    const [icon, setIcon] = useState("📦")
    const [color, setColor] = useState(CATEGORY_COLORS[5])

    const isEditMode = !!category

    // Initialize form when category changes or sheet opens
    useEffect(() => {
        if (isOpen) {
            if (category) {
                setName(category.name)
                setIcon(category.icon || "📦")
                setColor(category.color || CATEGORY_COLORS[5])
            } else {
                setName("")
                setIcon("📦")
                setColor(CATEGORY_COLORS[5])
            }
        }
    }, [isOpen, category])

    const handleSubmit = () => {
        if (!name.trim()) return
        onSubmit({ name: name.trim(), icon, color })
        onClose()
    }

    const canSubmit = name.trim().length > 0

    return (
        <AnimatedSheet isOpen={isOpen} onClose={onClose}>
            {/* Hero Preview */}
            <div className="py-8 flex flex-col items-center gap-2">
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: `${color}20` }}
                >
                    {icon}
                </div>
                <span className={cn(
                    "text-lg font-medium transition-colors",
                    name ? "text-foreground" : "text-muted-foreground/40"
                )}>
                    {name || "Category name"}
                </span>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-4">
                <FormCard>
                    <FormTextInput
                        label="Name"
                        value={name}
                        onChange={setName}
                        placeholder="e.g. Groceries"
                    />
                    <FormDivider />

                    {/* Icon Picker */}
                    <div className="px-4 py-3">
                        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium block mb-3">
                            Icon
                        </label>
                        <div className="grid grid-cols-8 gap-2">
                            {CATEGORY_ICONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setIcon(emoji)}
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                                        icon === emoji
                                            ? "bg-primary/10 ring-2 ring-primary scale-110"
                                            : "bg-muted/50 hover:bg-muted active:scale-95"
                                    )}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <FormDivider />

                    {/* Color Picker */}
                    <div className="px-4 py-3">
                        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium block mb-3">
                            Color
                        </label>
                        <div className="flex gap-3 justify-center">
                            {CATEGORY_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-9 h-9 rounded-full transition-all",
                                        color === c
                                            ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                                            : "hover:scale-105 active:scale-95"
                                    )}
                                    style={{
                                        backgroundColor: c,
                                        // @ts-expect-error CSS custom property for ring color
                                        "--tw-ring-color": c
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </FormCard>
            </div>

            {/* Actions */}
            <SheetActions
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitLabel={isEditMode ? "Save Changes" : "Add Category"}
                canSubmit={canSubmit}
            />
        </AnimatedSheet>
    )
}
