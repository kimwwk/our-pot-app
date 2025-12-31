"use client"

import { useState } from "react"
import { ChevronRight, Check, Wallet } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface MemberPickerMember {
    id: string
    name: string
    avatar_url?: string
    is_kitty?: boolean | 0 | 1
}

interface MemberPickerProps {
    members: MemberPickerMember[]
    selectedMemberId: string
    onSelect: (memberId: string) => void
    placeholder?: string
    kittyLabel?: string
    kittySubtitle?: string
    memberSubtitle?: string
    className?: string
}

export function MemberPicker({
    members,
    selectedMemberId,
    onSelect,
    placeholder = "Select member",
    kittyLabel = "The Pot",
    kittySubtitle = "From shared pot",
    memberSubtitle = "Will be reimbursed",
    className,
}: MemberPickerProps) {
    const [isOpen, setIsOpen] = useState(false)

    const selectedMember = members.find(m => m.id === selectedMemberId)
    const isKitty = selectedMember?.is_kitty
    const kittyMember = members.find(m => m.is_kitty)
    const humanMembers = members.filter(m => !m.is_kitty)

    const handleSelect = (memberId: string) => {
        onSelect(memberId)
        setIsOpen(false)
    }

    return (
        <div className={cn("space-y-2", className)}>
            {/* Trigger Button - Row style */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-4 flex items-center justify-between border-b border-border/60 text-left"
                type="button"
            >
                <div>
                    <span className="text-xs text-muted-foreground block mb-1">Paid by</span>
                    {isKitty ? (
                        <span className="text-base font-medium flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-primary" />
                            {kittyLabel}
                        </span>
                    ) : selectedMember ? (
                        <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={selectedMember.avatar_url} />
                                <AvatarFallback className="text-[10px]">{selectedMember.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-base font-medium">{selectedMember.name}</span>
                            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">reimburse</span>
                        </div>
                    ) : (
                        <span className="text-base text-muted-foreground/50">{placeholder}</span>
                    )}
                </div>
                <ChevronRight className={cn("h-5 w-5 text-muted-foreground/40 transition-transform", isOpen && "rotate-90")} />
            </button>

            {/* Expanded Options */}
            {isOpen && (
                <div className="space-y-1 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Kitty/Pot Option */}
                    {kittyMember && (
                        <button
                            onClick={() => handleSelect(kittyMember.id)}
                            className={cn(
                                "w-full flex items-center gap-3 p-4 rounded-xl transition-all",
                                selectedMemberId === kittyMember.id
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/40"
                            )}
                            type="button"
                        >
                            <div className={cn(
                                "h-11 w-11 rounded-full flex items-center justify-center",
                                selectedMemberId === kittyMember.id ? "bg-primary/15" : "bg-muted/60"
                            )}>
                                <Wallet className={cn(
                                    "h-5 w-5",
                                    selectedMemberId === kittyMember.id ? "text-primary" : "text-muted-foreground"
                                )} />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-base font-medium">{kittyLabel}</p>
                                <p className="text-xs text-muted-foreground">{kittySubtitle}</p>
                            </div>
                            {selectedMemberId === kittyMember.id && (
                                <Check className="h-5 w-5 text-primary" />
                            )}
                        </button>
                    )}

                    {/* Members Section */}
                    {humanMembers.length > 0 && (
                        <>
                            <div className="px-4 py-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Members</p>
                            </div>

                            {humanMembers.map((member) => (
                                <button
                                    key={member.id}
                                    onClick={() => handleSelect(member.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-4 rounded-xl transition-all",
                                        selectedMemberId === member.id
                                            ? "bg-primary/10"
                                            : "hover:bg-muted/40"
                                    )}
                                    type="button"
                                >
                                    <Avatar className="h-11 w-11">
                                        <AvatarImage src={member.avatar_url} />
                                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-left">
                                        <p className="text-base font-medium">{member.name}</p>
                                        <p className="text-xs text-amber-600">{memberSubtitle}</p>
                                    </div>
                                    {selectedMemberId === member.id && (
                                        <Check className="h-5 w-5 text-primary" />
                                    )}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
