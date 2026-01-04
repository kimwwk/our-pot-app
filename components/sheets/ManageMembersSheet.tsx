"use client"

import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Plus, Search, Users, Wallet, Trash2, Pencil } from "lucide-react"
import { useSQLite } from "@/lib/data/contexts/SQLiteContext"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { MemberRepository } from "@/lib/data/repositories/MemberRepository"
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository"
import { generateId } from "@/lib/utils/ulid"
import { toast } from "sonner"
import { Member } from "@/lib/data/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MemberSheet } from "./MemberSheet"
import { MemberDetailSheet } from "./MemberDetailSheet"
import { EmptyState } from "@/components/common/EmptyState"

interface ManageMembersSheetProps {
    isOpen: boolean
    onClose: () => void
    members: Member[]
    onUpdate: () => void
}

export function ManageMembersSheet({
    isOpen,
    onClose,
    members,
    onUpdate
}: ManageMembersSheetProps) {
    const { db } = useSQLite()
    const { account } = useAccount()

    const [searchQuery, setSearchQuery] = useState("")
    const [editingMember, setEditingMember] = useState<Member | null>(null)
    const [viewingMember, setViewingMember] = useState<Member | null>(null)
    const [isAddingMember, setIsAddingMember] = useState(false)

    // Filter members by search
    const filteredMembers = useMemo(() => {
        let filtered = members
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(m => m.name.toLowerCase().includes(query))
        }
        return filtered
    }, [members, searchQuery])

    const humanMembers = filteredMembers.filter(m => !m.is_kitty)
    const kittyMember = members.find(m => m.is_kitty)
    const showSearch = members.length > 5

    const handleCreate = async (data: { name: string }) => {
        if (!db || !account) return

        try {
            const repo = new MemberRepository(db)
            await repo.create({
                id: generateId(),
                account_id: account.id,
                name: data.name,
                role: "member",
                is_kitty: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })

            toast.success("Member added")
            onUpdate()
        } catch (e) {
            console.error(e)
            toast.error("Failed to add member")
        }
    }

    const handleUpdate = async (data: { name: string }) => {
        if (!db || !editingMember) return

        try {
            const repo = new MemberRepository(db)
            await repo.update(editingMember.id, {
                name: data.name,
                updated_at: new Date().toISOString(),
            })

            toast.success("Member updated")
            setEditingMember(null)
            onUpdate()
        } catch (e) {
            console.error(e)
            toast.error("Failed to update member")
        }
    }

    const handleDelete = async (e: React.MouseEvent, member: Member) => {
        e.stopPropagation() // Prevent triggering edit
        if (!db || member.is_kitty) return

        try {
            // Check if member has transactions
            const transactionRepo = new TransactionRepository(db)
            const memberTransactions = await transactionRepo.getAllByAccount(
                account?.id || '',
                { memberId: member.id }
            )

            if (memberTransactions.length > 0) {
                toast.error(`Cannot delete member with ${memberTransactions.length} transaction(s)`)
                return
            }

            const repo = new MemberRepository(db)
            await repo.softDelete(member.id)
            toast.success(`${member.name} removed`)
            onUpdate()
        } catch (e) {
            console.error(e)
            toast.error("Failed to delete member")
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
                        <div className="flex items-center gap-3 px-4 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[env(safe-area-inset-top,0px)]">
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted active:scale-95 transition-all"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <h1 className="text-lg font-semibold flex-1">Members</h1>
                        </div>

                        {/* Search (if many members) */}
                        {showSearch && (
                            <div className="px-4 py-3 border-b">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search members..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-muted/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Member List */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            {members.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    title="No members yet"
                                    description="Add household members to track shared expenses"
                                    action={{
                                        label: "Add Member",
                                        onClick: () => setIsAddingMember(true)
                                    }}
                                />
                            ) : (
                                <div className="space-y-4">
                                    {/* The Pot (non-editable, non-deletable) */}
                                    {kittyMember && (
                                        <div>
                                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 px-1">
                                                Shared Pot
                                            </div>
                                            <div className="flex items-center gap-3 p-3 border rounded-xl bg-card">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Wallet className="h-5 w-5 text-primary" />
                                                </div>
                                                <span className="font-medium flex-1">The Pot</span>
                                                <span className="text-xs text-muted-foreground">Shared fund</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Human Members */}
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 px-1">
                                            Members
                                        </div>
                                        <div className="space-y-2">
                                            {humanMembers.length === 0 && searchQuery ? (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    No members match "{searchQuery}"
                                                </div>
                                            ) : (
                                                <>
                                                    {humanMembers.map(member => (
                                                        <div
                                                            key={member.id}
                                                            onClick={() => setViewingMember(member)}
                                                            className="flex items-center gap-3 p-3 border rounded-xl bg-card cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                                                        >
                                                            <Avatar className="h-10 w-10">
                                                                <AvatarImage src={member.avatar_url} />
                                                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium flex-1">{member.name}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setEditingMember(member)
                                                                }}
                                                                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDelete(e, member)}
                                                                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </>
                                            )}

                                            {/* Add Member Row */}
                                            <button
                                                onClick={() => setIsAddingMember(true)}
                                                className="w-full flex items-center gap-3 p-3 border border-dashed rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                            >
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/50">
                                                    <Plus className="h-5 w-5" />
                                                </div>
                                                <span className="font-medium">Add member</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Add/Edit Member Sheet */}
                    <MemberSheet
                        isOpen={isAddingMember || !!editingMember}
                        onClose={() => {
                            setIsAddingMember(false)
                            setEditingMember(null)
                        }}
                        onSubmit={editingMember ? handleUpdate : handleCreate}
                        member={editingMember}
                    />

                    {/* Member Detail Sheet (for viewing pot details) */}
                    <MemberDetailSheet
                        member={viewingMember}
                        isOpen={!!viewingMember}
                        onClose={() => setViewingMember(null)}
                    />
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
