"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { logEvent, setScreen } from "@/lib/utils/analytics"

/**
 * Reports a screen_view to Firebase Analytics whenever the route changes.
 * Renders nothing. No-ops off-device (see lib/utils/analytics).
 */
export function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const screenName = pathname === "/" ? "home" : pathname.replace(/^\//, "")
    void setScreen(screenName)
    void logEvent("screen_view", { screen_name: screenName, screen_class: screenName })
  }, [pathname])

  return null
}
