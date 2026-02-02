"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { getAppInfo, type AppInfo } from "@/lib/utils/app-info"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "next-themes"
import { BackupSheet } from "@/components/sheets/BackupSheet"
import { RestoreSheet } from "@/components/sheets/RestoreSheet"
import { ManageCategoriesSheet } from "@/components/sheets/ManageCategoriesSheet"
import { ManageMembersSheet } from "@/components/sheets/ManageMembersSheet"
import { useCategories } from "@/lib/data/hooks/useCategories"
import { useMembers } from "@/lib/data/hooks/useMembers"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { getDebugLogs, clearDebugLogs } from "@/lib/utils/debug-logger"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function SettingsTab() {
  const { theme, setTheme } = useTheme()
  const { account } = useAccount()
  const { categories, refetch: refetchCats } = useCategories()
  const { members, refetch: refetchMembers } = useMembers()
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [showMemberManager, setShowMemberManager] = useState(false)
  const [showBackupSheet, setShowBackupSheet] = useState(false)
  const [showRestoreSheet, setShowRestoreSheet] = useState(false)
  const [showDebugLogs, setShowDebugLogs] = useState(false)
  const [debugLogs, setDebugLogs] = useState<Array<{ timestamp: string; type: string; message: string }>>([])
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [devModeEnabled, setDevModeEnabled] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    getAppInfo().then(setAppInfo)
  }, [])

  const handleAboutTap = () => {
    if (devModeEnabled) return

    // Clear existing timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current)
    }

    const newCount = tapCount + 1
    setTapCount(newCount)

    if (newCount >= 5) {
      setDevModeEnabled(true)
      setTapCount(0)
      toast.success("Developer mode enabled")
    } else if (newCount >= 3) {
      toast(`${5 - newCount} taps to enable developer mode`)
    }

    // Reset tap count after 2 seconds of no tapping
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0)
    }, 2000)
  }

  const handleShowDebugLogs = () => {
    const logs = getDebugLogs()
    setDebugLogs(logs)
    setShowDebugLogs(true)
  }

  const settingGroups = [
    {
      title: "Pot Settings",
      items: [
        {
          icon: "group",
          label: "Manage Members",
          description: `${members.filter(m => !m.is_kitty).length} members`,
          onClick: () => setShowMemberManager(true),
        },
        {
          icon: "category",
          label: "Categories",
          description: `${categories.length} categories`,
          onClick: () => setShowCategoryManager(true),
        },
      ],
    },
    {
      title: "Data Management",
      items: [
        {
          icon: "download",
          label: "Backup Database",
          description: "Export your data",
          onClick: () => setShowBackupSheet(true),
        },
        {
          icon: "upload",
          label: "Restore from Backup",
          description: "Import previous backup",
          onClick: () => setShowRestoreSheet(true),
        },
      ],
    },
    {
      title: "Notifications",
      items: [
        {
          icon: "notifications",
          label: "Push Notifications",
          description: "Coming soon",
          toggle: true,
          enabled: false,
          disabled: true,
        },
      ],
    },
    {
      title: "Appearance",
      items: [
        {
          icon: "dark_mode",
          label: "Dark Mode",
          toggle: true,
          enabled: theme === "dark",
          onToggle: () => setTheme(theme === "dark" ? "light" : "dark"),
        },
      ],
    },
    {
      title: "Developer Tools",
      items: [
        {
          icon: "bug_report",
          label: "View Debug Logs",
          description: "Show console logs",
          onClick: handleShowDebugLogs,
        },
      ],
    },
  ]

  if (!account) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5 pt-4 pb-24">
        {/* Settings groups */}
        {settingGroups
          .filter(group => group.title !== "Developer Tools" || devModeEnabled)
          .map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.05 }}
          >
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 px-1">
              {group.title}
            </h3>
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              {group.items.map((item, itemIndex) => {
                const isToggle = 'toggle' in item && item.toggle
                const Wrapper = isToggle ? "div" : "button"
                return (
                  <Wrapper
                    key={item.label}
                    {...(!isToggle && {
                      disabled: 'disabled' in item ? item.disabled : false,
                      onClick: 'onClick' in item ? item.onClick : undefined,
                    })}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 transition-colors",
                      'disabled' in item && item.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : isToggle
                        ? ""
                        : "hover:bg-muted/50 active:bg-muted cursor-pointer",
                      itemIndex !== group.items.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50">
                      <span className="material-symbols-outlined text-foreground" style={{ fontSize: "22px" }}>
                        {item.icon}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground">{item.label}</p>
                      {'description' in item && item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </div>
                    {isToggle && 'enabled' in item && 'onToggle' in item ? (
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={item.onToggle}
                        disabled={'disabled' in item ? (item.disabled as boolean) : false}
                      />
                    ) : (
                      !('disabled' in item && item.disabled) && (
                        <span className="material-symbols-outlined text-muted-foreground" style={{ fontSize: "20px" }}>
                          chevron_right
                        </span>
                      )
                    )}
                  </Wrapper>
                )
              })}
            </div>
          </motion.div>
        ))}

        {/* About section with app icon and version */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: settingGroups.length * 0.05 }}
          className="flex flex-col items-center justify-center pt-8 pb-8"
        >
          <button
            onClick={handleAboutTap}
            className="flex flex-col items-center focus:outline-none active:scale-95 transition-transform"
          >
            <div className="relative h-20 w-20 mb-4 rounded-2xl overflow-hidden shadow-lg shadow-primary/10">
              <Image
                src="/icon1024.png"
                alt="OurPot"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-lg font-bold text-foreground">OurPot</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {appInfo ? `v${appInfo.version}${appInfo.build ? ` (${appInfo.build})` : ''}` : 'Loading...'}
            </p>
          </button>
        </motion.div>
      </div>

      {/* Category Manager Sheet */}
      <ManageCategoriesSheet
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onUpdate={refetchCats}
      />

      {/* Member Manager Sheet */}
      <ManageMembersSheet
        isOpen={showMemberManager}
        onClose={() => setShowMemberManager(false)}
        members={members}
        onUpdate={refetchMembers}
      />

      {/* Backup Sheet */}
      <BackupSheet
        isOpen={showBackupSheet}
        onClose={() => setShowBackupSheet(false)}
      />

      {/* Restore Sheet */}
      <RestoreSheet
        isOpen={showRestoreSheet}
        onClose={() => setShowRestoreSheet(false)}
      />

      {/* Debug Logs Modal */}
      {showDebugLogs && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl shadow-xl border border-border max-w-4xl w-full max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-foreground" style={{ fontSize: "20px" }}>
                    bug_report
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Debug Logs</h2>
                  <p className="text-xs text-muted-foreground">Last {debugLogs.length} console messages</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearDebugLogs()
                    setDebugLogs([])
                  }}
                  className="rounded-lg"
                >
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebugLogs(false)}
                  className="rounded-lg"
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-2 font-mono text-xs">
                {debugLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="material-symbols-outlined text-muted-foreground mb-2" style={{ fontSize: "32px" }}>
                      description
                    </span>
                    <p className="text-muted-foreground">No logs yet. Logs will appear here as you use the app.</p>
                  </div>
                ) : (
                  debugLogs.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg",
                        log.type === 'error'
                          ? 'bg-destructive/10 text-destructive'
                          : log.type === 'warn'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-muted/50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="flex-1 whitespace-pre-wrap break-all">
                          {log.message}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
