"use client";

import { motion } from "framer-motion";
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    Sparkles,
    Wrench,
    XCircle,
    Zap,
} from "lucide-react";
import type { ChangeSetStatus, ExecutionError } from "@/lib/ai/types";
import { isTransientError, isRecoverableError } from "@/lib/ai/errorClassification";

/**
 * BL-022: Agent State Display
 *
 * States:
 * - Invalid Input: AI determined input is invalid (ended, no action buttons)
 * - Proposing: AI building changeset
 * - Executing: Database operation in progress
 * - Fixing: AI auto-recovering from error
 * - Error: Critical unrecoverable error
 * - Done: Completed successfully
 */

export type AgentState =
    | "idle"
    | "proposing"
    | "pending_approval"
    | "executing"
    | "fixing"
    | "error"
    | "done"
    | "invalid_input";

interface AgentStateConfig {
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    animate?: boolean;
}

const STATE_CONFIGS: Record<AgentState, AgentStateConfig> = {
    idle: {
        label: "Ready",
        description: "Waiting for input",
        icon: <Sparkles className="h-4 w-4" />,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
    },
    proposing: {
        label: "Proposing",
        description: "AI is building a changeset",
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        color: "text-primary",
        bgColor: "bg-primary/10",
        animate: true,
    },
    pending_approval: {
        label: "Review",
        description: "Awaiting your approval",
        icon: <AlertCircle className="h-4 w-4" />,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
    },
    executing: {
        label: "Executing",
        description: "Applying changes",
        icon: <Zap className="h-4 w-4" />,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        animate: true,
    },
    fixing: {
        label: "Fixing",
        description: "AI is recovering from error",
        icon: <Wrench className="h-4 w-4" />,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        animate: true,
    },
    error: {
        label: "Error",
        description: "Critical error occurred",
        icon: <XCircle className="h-4 w-4" />,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
    },
    done: {
        label: "Done",
        description: "Changes applied successfully",
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
    },
    invalid_input: {
        label: "Invalid",
        description: "Request cannot be processed",
        icon: <XCircle className="h-4 w-4" />,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
    },
};

/**
 * Derive the current agent state from chat status and changeset context
 */
export function deriveAgentState(params: {
    chatStatus: "submitted" | "streaming" | "ready" | "error";
    changeSetStatus: ChangeSetStatus;
    lastError: ExecutionError | null;
    isInvalidInput?: boolean;
}): AgentState {
    const { chatStatus, changeSetStatus, lastError, isInvalidInput } = params;

    // Invalid input state (AI signaled invalid)
    if (isInvalidInput) {
        return "invalid_input";
    }

    // Check if AI is processing
    const isProcessing = chatStatus === "submitted" || chatStatus === "streaming";

    // Executing state
    if (changeSetStatus === "executing") {
        return "executing";
    }

    // Pending approval state
    if (changeSetStatus === "pending_approval") {
        return "pending_approval";
    }

    // Done state (recently approved)
    if (changeSetStatus === "approved") {
        return "done";
    }

    // Check if we're in fixing mode (building after error)
    if (changeSetStatus === "building" && lastError) {
        // If it was a transient error, AI can auto-retry
        // If recoverable, AI is fixing the changeset
        if (isTransientError(lastError) || isRecoverableError(lastError)) {
            return "fixing";
        }
        // Critical error that AI signaled
        return "error";
    }

    // Building or processing = proposing
    if (changeSetStatus === "building" || isProcessing) {
        return "proposing";
    }

    // Execution failed with critical error
    if (changeSetStatus === "execution_failed") {
        if (lastError && !isRecoverableError(lastError) && !isTransientError(lastError)) {
            return "error";
        }
        return "fixing";
    }

    // Default idle state
    return "idle";
}

interface AgentStateIndicatorProps {
    chatStatus: "submitted" | "streaming" | "ready" | "error";
    changeSetStatus: ChangeSetStatus;
    lastError: ExecutionError | null;
    isInvalidInput?: boolean;
    compact?: boolean;
}

export function AgentStateIndicator({
    chatStatus,
    changeSetStatus,
    lastError,
    isInvalidInput,
    compact = false,
}: AgentStateIndicatorProps) {
    const state = deriveAgentState({
        chatStatus,
        changeSetStatus,
        lastError,
        isInvalidInput,
    });

    const config = STATE_CONFIGS[state];

    // Don't show indicator in idle state
    if (state === "idle") {
        return null;
    }

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}
            >
                {config.icon}
                <span>{config.label}</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 rounded-xl p-4 ${config.bgColor}`}
        >
            <div className={config.color}>
                {config.icon}
            </div>
            <div className="flex-1">
                <p className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                </p>
                <p className="text-xs text-muted-foreground">
                    {config.description}
                </p>
            </div>
            {config.animate && (
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                                duration: 1,
                                repeat: Number.POSITIVE_INFINITY,
                                delay: i * 0.2,
                            }}
                            className="w-1.5 h-1.5 rounded-full bg-foreground/30"
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
