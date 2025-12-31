"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Bell, Users, ChevronRight, Moon, Palette, Info, Download, Upload, Bug } from "lucide-react"
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
          icon: Users,
          label: "Manage Members",
          description: `${members.filter(m => !m.is_kitty).length} members`,
          onClick: () => setShowMemberManager(true),
        },
        {
          icon: Palette,
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
          icon: Download,
          label: "Backup Database",
          description: "Export your data",
          onClick: () => setShowBackupSheet(true),
        },
        {
          icon: Upload,
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
          icon: Bell,
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
          icon: Moon,
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
          icon: Bug,
          label: "View Debug Logs",
          description: "Show console logs",
          onClick: handleShowDebugLogs,
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: Info,
          label: "Version",
          description: "v0.1.0 • OurPot",
          disabled: true,
        },
      ],
    },
  ]

  if (!account) {
    return (
      <div className="p-4 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 space-y-6 pb-24">
        {/* Settings groups */}
        {settingGroups.map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">{group.title}</h3>
            <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
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
                    className={`w-full flex items-center gap-4 p-4 transition-colors ${
                      'disabled' in item && item.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : isToggle
                        ? ""
                        : "hover:bg-accent/50 active:bg-accent cursor-pointer"
                    } ${itemIndex !== group.items.length - 1 ? "border-b border-border/50" : ""}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <item.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">{item.label}</p>
                      {'description' in item && item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </div>
                    {isToggle && 'enabled' in item && 'onToggle' in item ? (
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={item.onToggle}
                        disabled={'disabled' in item ? (item.disabled as boolean) : false}
                      />
                    ) : (
                      !('disabled' in item && item.disabled) && <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Wrapper>
                )
              })}
            </div>
          </motion.div>
        ))}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">Debug Logs</h2>
                <p className="text-sm text-muted-foreground">Last {debugLogs.length} console messages</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearDebugLogs()
                    setDebugLogs([])
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowDebugLogs(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-2 font-mono text-xs">
                {debugLogs.length === 0 ? (
                  <p className="text-muted-foreground">No logs yet. Logs will appear here as you use the app.</p>
                ) : (
                  debugLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded ${
                        log.type === 'error'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : log.type === 'warn'
                          ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                          : 'bg-muted'
                      }`}
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
          </div>
        </div>
      )}
    </>
  )
}
