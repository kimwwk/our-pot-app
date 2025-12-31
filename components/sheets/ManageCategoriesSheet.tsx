"use client"

import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Plus, Search, Palette, Trash2 } from "lucide-react"
import { useSQLite } from "@/lib/data/contexts/SQLiteContext"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { CategoryRepository } from "@/lib/data/repositories/CategoryRepository"
import { generateId } from "@/lib/utils/ulid"
import { toast } from "sonner"
import { Category } from "@/lib/data/types"
import { CategorySheet } from "./CategorySheet"
import { EmptyState } from "@/components/common/EmptyState"

interface ManageCategoriesSheetProps {
    isOpen: boolean
    onClose: () => void
    categories: Category[]
    onUpdate: () => void
}

export function ManageCategoriesSheet({
    isOpen,
    onClose,
    categories,
    onUpdate
}: ManageCategoriesSheetProps) {
    const { db } = useSQLite()
    const { account } = useAccount()

    const [searchQuery, setSearchQuery] = useState("")
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [isAddingCategory, setIsAddingCategory] = useState(false)

    // Filter categories by search
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return categories
        const query = searchQuery.toLowerCase()
        return categories.filter(c => c.name.toLowerCase().includes(query))
    }, [categories, searchQuery])

    const showSearch = categories.length > 5

    const handleCreate = async (data: { name: string; icon: string; color: string }) => {
        if (!db || !account) return

        try {
            const repo = new CategoryRepository(db)
            await repo.create({
                id: generateId(),
                account_id: account.id,
                name: data.name,
                color: data.color,
                icon: data.icon,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })

            toast.success("Category created")
            onUpdate()
        } catch (e) {
            console.error(e)
            toast.error("Failed to create category")
        }
    }

    const handleUpdate = async (data: { name: string; icon: string; color: string }) => {
        if (!db || !editingCategory) return

        try {
            const repo = new CategoryRepository(db)
            await repo.update(editingCategory.id, {
                name: data.name,
                color: data.color,
                icon: data.icon,
                updated_at: new Date().toISOString(),
            })

            toast.success("Category updated")
            setEditingCategory(null)
            onUpdate()
        } catch (e) {
            console.error(e)
            toast.error("Failed to update category")
        }
    }

    const handleDelete = async (e: React.MouseEvent, category: Category) => {
        e.stopPropagation() // Prevent triggering edit
        if (!db) return

        try {
            const repo = new CategoryRepository(db)
            await repo.softDelete(category.id)
            toast.success("Category deleted")
            onUpdate()
        } catch (e) {
            console.error(e)
            toast.error("Failed to delete category")
        }
    }

    if (typeof window === "undefined") return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 bg-background"
                >
                    {/* Full page content */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="h-full flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted active:scale-95 transition-all"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <h1 className="text-lg font-semibold flex-1">Categories</h1>
                        </div>

                        {/* Search (if many categories) */}
                        {showSearch && (
                            <div className="px-4 py-3 border-b">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search categories..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-muted/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Category List */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            {categories.length === 0 ? (
                                <EmptyState
                                    icon={Palette}
                                    title="No categories yet"
                                    description="Add categories to organize your expenses"
                                    action={{
                                        label: "Add Category",
                                        onClick: () => setIsAddingCategory(true)
                                    }}
                                />
                            ) : (
                                <div className="space-y-2">
                                    {filteredCategories.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            No categories match "{searchQuery}"
                                        </div>
                                    ) : (
                                        <>
                                            {filteredCategories.map(category => (
                                                <div
                                                    key={category.id}
                                                    onClick={() => setEditingCategory(category)}
                                                    className="flex items-center gap-3 p-3 border rounded-xl bg-card cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                                        style={{ backgroundColor: `${category.color}20` }}
                                                    >
                                                        {category.icon || "📦"}
                                                    </div>
                                                    <span className="font-medium flex-1">{category.name}</span>
                                                    <button
                                                        onClick={(e) => handleDelete(e, category)}
                                                        className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Add Category Row */}
                                    <button
                                        onClick={() => setIsAddingCategory(true)}
                                        className="w-full flex items-center gap-3 p-3 border border-dashed rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50">
                                            <Plus className="h-5 w-5" />
                                        </div>
                                        <span className="font-medium">Add category</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Add/Edit Category Sheet */}
                    <CategorySheet
                        isOpen={isAddingCategory || !!editingCategory}
                        onClose={() => {
                            setIsAddingCategory(false)
                            setEditingCategory(null)
                        }}
                        onSubmit={editingCategory ? handleUpdate : handleCreate}
                        category={editingCategory}
                    />
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
