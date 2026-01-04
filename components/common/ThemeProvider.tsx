"use client"

import * as React from "react"
import { useEffect } from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { Capacitor } from "@capacitor/core"
import { StatusBar, Style } from "@capacitor/status-bar"

function StatusBarSync() {
    const { resolvedTheme } = useTheme()

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return

        const updateStatusBar = async () => {
            try {
                // Dark theme = light status bar text, Light theme = dark status bar text
                await StatusBar.setStyle({
                    style: resolvedTheme === "dark" ? Style.Dark : Style.Light,
                })
            } catch (e) {
                console.warn("Failed to update status bar style:", e)
            }
        }

        updateStatusBar()
    }, [resolvedTheme])

    return null
}

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider {...props}>
            <StatusBarSync />
            {children}
        </NextThemesProvider>
    )
}
