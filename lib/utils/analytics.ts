import { Capacitor, registerPlugin } from "@capacitor/core"
import type { FirebaseAnalyticsPlugin } from "@capacitor-firebase/analytics"

/**
 * Thin wrapper around Firebase Analytics (Capacitor plugin).
 *
 * We register the native bridge directly instead of importing the package's
 * default export, because that export wires up a web implementation which
 * statically pulls in the heavy `firebase` JS SDK — code we never run on
 * Android. The type is imported type-only, so it is erased at build time and
 * nothing from `firebase` ends up in the bundle.
 *
 * Analytics only runs on a native platform (Android). On the web build
 * (`npm run dev` in a browser, Jest, SSR/export) every call is a no-op so the
 * missing native bridge never throws. All calls are best-effort: an analytics
 * failure must never break a user action, so errors are swallowed with a warn.
 */
const FirebaseAnalytics = registerPlugin<FirebaseAnalyticsPlugin>("FirebaseAnalytics")

const isNative = Capacitor.isNativePlatform()

export type AnalyticsParams = Record<string, string | number | boolean>

export async function logEvent(name: string, params?: AnalyticsParams): Promise<void> {
  if (!isNative) return
  try {
    await FirebaseAnalytics.logEvent({ name, params })
  } catch (error) {
    console.warn("[analytics] logEvent failed:", error)
  }
}

export async function setScreen(screenName: string): Promise<void> {
  if (!isNative) return
  try {
    await FirebaseAnalytics.setCurrentScreen({ screenName })
  } catch (error) {
    console.warn("[analytics] setCurrentScreen failed:", error)
  }
}
