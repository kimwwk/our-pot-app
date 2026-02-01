"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useChangeSet } from "@/lib/data/contexts/ChangeSetContext";
import { handleToolCall } from "@/lib/ai/transformation";
import { ChangeSetRepository } from "@/lib/data/repositories/ChangeSetRepository";
import { buildContextAfterDecision, buildErrorContext } from "@/lib/ai/prompts";
import { ChangeSetReviewWidget } from "./ChangeSetReviewWidget";
import { AgentStateIndicator, deriveAgentState } from "./AgentStateIndicator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AgentMode = "direct" | "chat" | "budget" | "insights" | "scan";

const modes: { id: AgentMode; label: string; icon: string; enabled: boolean }[] = [
  { id: "direct", label: "Direct Entry", icon: "edit_note", enabled: true },
  { id: "chat", label: "Chat", icon: "forum", enabled: true }, // UI placeholder enabled
  { id: "budget", label: "Budget", icon: "pie_chart", enabled: false },
  { id: "insights", label: "Insights", icon: "analytics", enabled: false },
  { id: "scan", label: "Scan", icon: "document_scanner", enabled: false },
];

const trySayingSuggestions = [
  "Coffee and taxi €25 each",
  "Groceries €45, beer €12",
  "Split dinner with Alex €60",
];

export function AgentTab() {
  const { db, isInitialized } = useSQLite();
  const { account } = useAccount();
  const changeSetContext = useChangeSet();

  const dbRef = useRef(db);
  const accountRef = useRef(account);
  const isInitializedRef = useRef(isInitialized);
  const changeSetContextRef = useRef(changeSetContext);

  useEffect(() => {
    dbRef.current = db;
    accountRef.current = account;
    isInitializedRef.current = isInitialized;
    changeSetContextRef.current = changeSetContext;
  }, [db, account, isInitialized, changeSetContext]);

  const pendingConfirmationResolver = useRef<((result: any) => void) | null>(null);

  const [activeMode, setActiveMode] = useState<AgentMode>("direct");
  const [inputValue, setInputValue] = useState("");
  const [lastSubmittedInput, setLastSubmittedInput] = useState("");

  const {
    sendMessage,
    addToolOutput,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: process.env.NEXT_PUBLIC_BACKEND_URL + "/api/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const currentDb = dbRef.current;
      const currentAccount = accountRef.current;

      if (!currentDb || !currentAccount) {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: `Database or account not initialized`,
        });
        return;
      }

      const result = await handleToolCall(
        toolCall.toolName,
        toolCall.input,
        {
          db: currentDb,
          accountId: currentAccount.id,
          changeSetActions: {
            addChangeRequest: changeSetContextRef.current.addChangeRequest,
            removeChangeRequest: changeSetContextRef.current.removeChangeRequest,
            transitionToPendingApproval: changeSetContextRef.current.transitionToPendingApproval,
            clearBuffer: changeSetContextRef.current.clearBuffer,
            getBufferAsArray: changeSetContextRef.current.getBufferAsArray,
          },
        }
      );

      if (result.type === 'success') {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: result.output,
        });
      } else if (result.type === 'error') {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: result.errorText,
        });
      } else if (result.type === 'pause') {
        pendingConfirmationResolver.current = (resultData: any) => {
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output: resultData,
          });
        };
      }
    },
  });

  const handleModeChange = (mode: AgentMode) => {
    const modeConfig = modes.find(m => m.id === mode);
    if (modeConfig && !modeConfig.enabled) {
      toast.info(`${modeConfig.label} coming soon!`);
      return;
    }
    setActiveMode(mode);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    setLastSubmittedInput(inputValue); // Save for "Original Note" display
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: inputValue }],
    });
    setInputValue("");
  };

  const handleClear = () => {
    setInputValue("");
  };

  const handleApprove = async () => {
    const currentDb = dbRef.current;
    const currentAccount = accountRef.current;

    if (!currentDb || !currentAccount || !changeSetContext.currentChangeSetId) {
      return;
    }

    try {
      const repo = new ChangeSetRepository(currentDb);
      const result = await repo.applyChangeSet(changeSetContext.currentChangeSetId);

      if (result.success) {
        changeSetContext.transitionToApproved();
        if (pendingConfirmationResolver.current) {
          pendingConfirmationResolver.current({
            success: true,
            message: buildContextAfterDecision({
              status: "approved",
              results: { summary: "All changes applied successfully" },
            }),
          });
          pendingConfirmationResolver.current = null;
        }
      } else {
        changeSetContext.transitionToExecutionFailed(result.error);
        if (pendingConfirmationResolver.current) {
          pendingConfirmationResolver.current({
            success: false,
            error: buildErrorContext(result.error),
          });
          pendingConfirmationResolver.current = null;
        }
      }
    } catch {
      changeSetContext.transitionToExecutionFailed();
      if (pendingConfirmationResolver.current) {
        pendingConfirmationResolver.current({
          success: false,
          error: "An unexpected error occurred. Please try again.",
        });
        pendingConfirmationResolver.current = null;
      }
    }
  };

  const handleReject = (feedback?: string) => {
    if (pendingConfirmationResolver.current) {
      pendingConfirmationResolver.current({
        success: false,
        feedback: buildContextAfterDecision({
          status: "rejected_with_feedback",
          feedback: feedback || "User requested changes",
        }),
      });
      pendingConfirmationResolver.current = null;
      changeSetContext.transitionToBuilding();
    } else {
      changeSetContext.transitionToBuilding();
    }
  };

  const handleDiscard = () => {
    changeSetContext.transitionToRejected();
    if (pendingConfirmationResolver.current) {
      pendingConfirmationResolver.current({
        success: false,
        rejected: true,
        message: buildContextAfterDecision({ status: "rejected_completely" }),
      });
      pendingConfirmationResolver.current = null;
    }
  };

  const isProcessing = status === "submitted" || status === "streaming";

  if (!isInitialized || !account) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Initializing...</p>
      </div>
    );
  }

  const agentState = deriveAgentState({
    chatStatus: status as "submitted" | "streaming" | "ready" | "error",
    changeSetStatus: changeSetContext.status,
    lastError: changeSetContext.lastError,
  });

  return (
    <div className="space-y-5 pt-4">
      {/* Mode Switcher - added py-1 to prevent ring cutoff */}
      <div className="overflow-x-auto no-scrollbar -mx-6 px-6 py-1">
        <div className="flex items-start gap-4 w-max">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={cn(
                "flex flex-col items-center gap-2 group min-w-[64px] transition-all",
                activeMode === mode.id ? "" : "opacity-60 hover:opacity-100"
              )}
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                  activeMode === mode.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "bg-card border border-border text-muted-foreground group-hover:bg-muted"
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>
                  {mode.icon}
                </span>
              </div>
              <span
                className={cn(
                  "text-[11px]",
                  activeMode === mode.id
                    ? "font-bold text-foreground"
                    : "font-medium text-muted-foreground"
                )}
              >
                {mode.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Mode UI Placeholder */}
      {activeMode === "chat" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col h-[60vh] bg-card rounded-2xl border border-border overflow-hidden"
        >
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-primary-foreground text-sm">smart_toy</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">AI Assistant</p>
              <p className="text-[10px] text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Online
              </p>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Welcome Message */}
            <div className="flex items-end gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <span className="material-symbols-outlined text-primary-foreground text-sm">smart_toy</span>
              </div>
              <div className="bg-muted/50 rounded-2xl rounded-bl-sm p-4 max-w-[85%]">
                <p className="text-sm text-foreground">
                  Hi! I'm ready to help you log expenses. Just tell me what you spent and I'll organize it for you.
                </p>
              </div>
            </div>

            {/* Coming Soon Overlay */}
            <div className="flex items-center justify-center py-8">
              <div className="bg-muted/80 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
                <span className="material-symbols-outlined text-muted-foreground text-2xl mb-2">chat</span>
                <p className="text-sm font-bold text-foreground">Chat Mode Coming Soon</p>
                <p className="text-xs text-muted-foreground mt-1">Full conversational AI for expense tracking</p>
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-border bg-card">
            <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
              <input
                type="text"
                placeholder="Type a message..."
                disabled
                className="flex-1 bg-transparent border-0 text-sm text-foreground placeholder-muted-foreground focus:ring-0 disabled:opacity-50"
              />
              <button
                disabled
                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary opacity-50"
              >
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Direct Entry Mode */}
      {activeMode === "direct" && (
        <>
          {/* Collapsed Original Note (when pending approval) */}
          {changeSetContext.status === "pending_approval" && lastSubmittedInput && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-card px-4 py-3 rounded-xl border border-border"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-sm">chat_bubble</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Original Note</p>
                <p className="text-sm text-foreground truncate font-medium">"{lastSubmittedInput}"</p>
              </div>
              <button
                onClick={() => {
                  setInputValue(lastSubmittedInput);
                }}
                className="text-primary text-xs font-bold px-2 py-1 hover:bg-primary/10 rounded transition-colors shrink-0"
              >
                Edit
              </button>
            </motion.div>
          )}

          {/* Smart Input Card (expanded when not pending approval) */}
          {changeSetContext.status !== "pending_approval" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border relative group focus-within:ring-2 focus-within:ring-primary/20 transition-all"
            >
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                  Smart Input
                </label>
                {inputValue && (
                  <button
                    onClick={handleClear}
                    className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors bg-muted px-2 py-1 rounded cursor-pointer"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-base leading-relaxed text-foreground focus:ring-0 resize-none h-32 placeholder-muted-foreground/50 font-medium"
                placeholder="Paste notes, dictation, or messy lists here..."
                disabled={isProcessing}
              />

              <div className="flex items-center justify-between mt-2 pt-3 border-t border-border">
                <button
                  onClick={() => toast.info("Dictation coming soon!")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors p-2 -ml-2 rounded-lg hover:bg-muted"
                >
                  <span className="material-symbols-outlined text-lg">mic</span>
                  Dictate
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isProcessing}
                  className="h-10 pl-3 pr-4 rounded-xl bg-foreground text-background text-xs font-bold flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                    auto_awesome
                  </span>
                  Magic Parse
                </button>
              </div>
            </motion.div>
          )}

      {/* Agent State Indicator */}
      <AgentStateIndicator
        chatStatus={status as "submitted" | "streaming" | "ready" | "error"}
        changeSetStatus={changeSetContext.status}
        lastError={changeSetContext.lastError}
      />

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-destructive/10 border border-destructive/20 p-4"
        >
          <p className="text-sm text-destructive font-medium">
            Error: {error instanceof Error ? error.message : String(error)}
          </p>
        </motion.div>
      )}

      {/* ChangeSet Review */}
      {changeSetContext.status === "pending_approval" && !isProcessing && (
        <ChangeSetReviewWidget
          onApprove={handleApprove}
          onReject={handleReject}
          onDiscard={handleDiscard}
          onModifyRequest={handleReject}
        />
      )}

      {/* Empty state with Try Saying suggestions */}
      {agentState === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-muted-foreground" style={{ fontSize: "32px" }}>
              auto_awesome
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No pending proposals</h3>
          <p className="text-sm text-muted-foreground max-w-[260px] mb-6">
            Enter your expenses above and the AI will parse them for your review
          </p>

          {/* Try Saying Section */}
          <div className="w-full max-w-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Try saying...
            </p>
            <div className="space-y-2">
              {trySayingSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(suggestion)}
                  className="w-full text-left px-4 py-3 bg-card hover:bg-muted/50 rounded-xl border border-border text-sm text-foreground transition-colors"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
        </>
      )}
    </div>
  );
}
