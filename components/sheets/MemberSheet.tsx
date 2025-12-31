"use client"

import { useState, useEffect } from "react"
import { AnimatedSheet } from "@/components/common/AnimatedSheet"
import {
    FormCard,
    FormTextInput,
    SheetActions
} from "@/components/common/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Member } from "@/lib/data/types"

interface MemberSheetProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (member: { name: string }) => void
    /** Pass member to edit, or undefined for add mode */
    member?: Member | null
}

export function MemberSheet({ isOpen, onClose, onSubmit, member }: MemberSheetProps) {
    const [name, setName] = useState("")

    const isEditMode = !!member

    // Initialize form when member changes or sheet opens
    useEffect(() => {
        if (isOpen) {
            if (member) {
                setName(member.name)
            } else {
                setName("")
            }
        }
    }, [isOpen, member])

    const handleSubmit = () => {
        if (!name.trim()) return
        onSubmit({ name: name.trim() })
        onClose()
    }

    const canSubmit = name.trim().length > 0
    const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : ""

    return (
        <AnimatedSheet isOpen={isOpen} onClose={onClose}>
            {/* Hero Preview */}
            <div className="py-8 flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20">
                    <AvatarFallback className={cn(
                        "text-2xl font-medium transition-colors",
                        initials ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/30"
                    )}>
                        {initials || "?"}
                    </AvatarFallback>
                </Avatar>
                <span className={cn(
                    "text-lg font-medium transition-colors",
                    name ? "text-foreground" : "text-muted-foreground/40"
                )}>
                    {name || "Member name"}
                </span>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-4">
                <FormCard>
                    <FormTextInput
                        label="Name"
                        value={name}
                        onChange={setName}
                        placeholder="e.g. Alice"
                    />
                </FormCard>
            </div>

            {/* Actions */}
            <SheetActions
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitLabel={isEditMode ? "Save Changes" : "Add Member"}
                canSubmit={canSubmit}
            />
        </AnimatedSheet>
    )
}
