"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Check, Wallet } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface MemberPickerMember {
    id: string
    name: string
    avatar_url?: string
    is_kitty?: boolean | 0 | 1
}

interface MemberPickerOverlayProps {
    isOpen: boolean
    onClose: () => void
    members: MemberPickerMember[]
    selectedMemberId: string
    onSelect: (memberId: string) => void
    /** Title shown in header */
    title?: string
    /** Label for the pot/kitty option */
    potLabel?: string
    /** Description for the pot/kitty option */
    potDescription?: string
    /** Description shown under human members */
    memberDescription?: string
    /** Whether to show the pot option */
    showPotOption?: boolean
}

/**
 * Generic member picker overlay.
 * Use for selecting members in various contexts (payer, contributor, etc.)
 *
 * @example Expense payer
 * <MemberPickerOverlay
 *   title="Paid by"
 *   potLabel="The Pot"
 *   potDescription="From shared pot"
 *   memberDescription="Pot will reimburse"
 *   ...
 * />
 *
 * @example Contribution
 * <MemberPickerOverlay
 *   title="Contributor"
 *   showPotOption={false}
 *   memberDescription="Adding to pot"
 *   ...
 * />
 */
export function MemberPickerOverlay({
    isOpen,
    onClose,
    members,
    selectedMemberId,
    onSelect,
    title = "Select member",
    potLabel = "The Pot",
    potDescription = "From shared pot",
    memberDescription,
    showPotOption = true,
}: MemberPickerOverlayProps) {
    const kittyMember = members.find(m => m.is_kitty)
    const humanMembers = members.filter(m => !m.is_kitty)

    const handleSelect = (memberId: string) => {
        onSelect(memberId)
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
                        style={{ borderRadius: "24px 24px 0 0", maxHeight: "65vh" }}
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
                            <span className="text-base font-semibold">{title}</span>
                            <div className="w-14" />
                        </div>

                        {/* Options */}
                        <div className="flex-1 overflow-y-auto p-3">
                            {/* Pot Option */}
                            {showPotOption && kittyMember && (
                                <button
                                    onClick={() => handleSelect(kittyMember.id)}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-2xl mb-2 transition-all active:scale-[0.98]",
                                        selectedMemberId === kittyMember.id
                                            ? "bg-primary/10 ring-2 ring-primary/20"
                                            : "hover:bg-muted/40"
                                    )}
                                    type="button"
                                >
                                    <div className={cn(
                                        "h-12 w-12 rounded-full flex items-center justify-center",
                                        selectedMemberId === kittyMember.id
                                            ? "bg-primary/15"
                                            : "bg-muted/60"
                                    )}>
                                        <Wallet className={cn(
                                            "h-6 w-6",
                                            selectedMemberId === kittyMember.id
                                                ? "text-primary"
                                                : "text-muted-foreground"
                                        )} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-base font-semibold">{potLabel}</p>
                                        <p className="text-sm text-muted-foreground">{potDescription}</p>
                                    </div>
                                    {selectedMemberId === kittyMember.id && (
                                        <Check className="h-5 w-5 text-primary" />
                                    )}
                                </button>
                            )}

                            {/* Members Section */}
                            {humanMembers.length > 0 && (
                                <>
                                    <div className="px-2 py-3">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                            Members
                                        </p>
                                    </div>

                                    {humanMembers.map((member) => (
                                        <button
                                            key={member.id}
                                            onClick={() => handleSelect(member.id)}
                                            className={cn(
                                                "w-full flex items-center gap-4 p-4 rounded-2xl mb-2 transition-all active:scale-[0.98]",
                                                selectedMemberId === member.id
                                                    ? "bg-primary/10 ring-2 ring-primary/20"
                                                    : "hover:bg-muted/40"
                                            )}
                                            type="button"
                                        >
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={member.avatar_url} />
                                                <AvatarFallback className="text-sm font-medium">
                                                    {member.name.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 text-left">
                                                <p className="text-base font-semibold">{member.name}</p>
                                                {memberDescription && (
                                                    <p className="text-sm text-amber-600">{memberDescription}</p>
                                                )}
                                            </div>
                                            {selectedMemberId === member.id && (
                                                <Check className="h-5 w-5 text-primary" />
                                            )}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>

                        <div className="pb-safe" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
