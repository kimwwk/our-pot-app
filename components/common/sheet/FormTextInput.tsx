"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface FormTextInputProps {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    onBlur?: () => void
    className?: string
}

/**
 * Text input field with label for use inside FormCard.
 *
 * @example
 * <FormTextInput
 *   label="Merchant"
 *   value={merchant}
 *   onChange={setMerchant}
 *   placeholder="Where did you spend?"
 * />
 */
export function FormTextInput({
    label,
    value,
    onChange,
    placeholder,
    onBlur,
    className
}: FormTextInputProps) {
    return (
        <div className={cn("px-4 py-4", className)}>
            <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium block">
                {label}
            </label>
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                className="border-0 p-0 h-auto text-[15px] bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30 mt-1"
            />
        </div>
    )
}

interface FormDateInputProps {
    label: string
    value: string
    onChange: (value: string) => void
    className?: string
}

/**
 * Date input field with label for use inside FormCard.
 */
export function FormDateInput({
    label,
    value,
    onChange,
    className
}: FormDateInputProps) {
    return (
        <div className={cn("px-4 py-3", className)}>
            <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium block">
                {label}
            </label>
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-transparent text-[15px] outline-none mt-1"
            />
        </div>
    )
}

interface FormTextAreaProps {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    rows?: number
    className?: string
}

/**
 * Textarea field with label for use inside FormCard.
 */
export function FormTextArea({
    label,
    value,
    onChange,
    placeholder,
    rows = 2,
    className
}: FormTextAreaProps) {
    return (
        <div className={cn("px-4 py-3", className)}>
            <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium block">
                {label}
            </label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full bg-transparent text-[15px] outline-none resize-none placeholder:text-muted-foreground/30 mt-1"
            />
        </div>
    )
}
