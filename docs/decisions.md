# Architecture & Design Decisions

## [2026-06-04] Migrate workers to the kivov-digital Cloudflare account (v2.1.1)

**Context**: The backend API and landing page moved to a new Cloudflare account.
The old `*.our-pot-backend-production.workers.dev` domain no longer resolves, so
released builds (v2.1.0 and earlier) cannot reach the API at all.

**Decision**: All references now use the new worker URLs:
- API: `https://our-pot-api.kivov-digital.workers.dev`
- Landing page: `https://our-pot-site.kivov-digital.workers.dev`

`NEXT_PUBLIC_BACKEND_URL` was updated in all three Android CI workflows
(`build-android.yml`, `build-android-release-test.yml`, `build-android-dev.yml`),
the version bumped to 2.1.1 (versionCode 20101), and a new signed AAB released
via the `v2.1.1` tag for the Google Play update. The corp-website product link
and our-pot-api README were updated in their own repos.

**Alternatives**: Keeping a stable custom domain (e.g. `api.ourpot.app`) in front
of the worker was considered out of scope for this fix, but would decouple shipped
app binaries from the workers.dev subdomain.

**Consequences**:
- `NEXT_PUBLIC_BACKEND_URL` is baked into the static export at build time, so any
  future backend URL change requires a rebuild **and** a Play Store update.
- v2.1.0 and earlier installs are broken (dead API domain) until users update to
  2.1.1 — rollout should not be delayed.

## [2026-05-30] Firebase Analytics via native Capacitor plugin (v2.1.0)

**Context**: We wanted product analytics for the Android app. The app is a Next.js
static export packaged with Capacitor, whose WebView serves content from
`https://localhost`. A GA4 *Web* data stream rejects `localhost` as the site URL,
and web `gtag.js` reports awkward `localhost` page paths from inside the WebView.

**Decision**: Use Firebase Analytics through the `@capacitor-firebase/analytics`
plugin (an **App** data stream keyed on the package name `com.ourpot.app`, not a
URL). Analytics is wrapped in `lib/utils/analytics.ts` and screen views are
reported from `components/common/AnalyticsTracker.tsx` on every route change.

Two implementation notes:
- The wrapper registers the native bridge directly with
  `registerPlugin<FirebaseAnalyticsPlugin>("FirebaseAnalytics")` and imports the
  plugin interface **type-only**. Importing the package's default export would
  pull in its web implementation, which statically imports the heavy `firebase`
  JS SDK and breaks the Turbopack static-export build. Registering directly keeps
  `firebase` out of the bundle entirely (it is an optional peer dep we don't need
  on Android).
- Every call is guarded by `Capacitor.isNativePlatform()` and wrapped in
  try/catch, so analytics is a silent no-op in the browser/dev/Jest and an
  analytics failure can never break a user action.

**Alternatives considered**:
- *GA4 web (`@next/third-parties`)*: rejected — GA4 Web streams reject `localhost`,
  and WebView page paths report as `localhost`. Initially chosen, then switched
  after hitting the localhost validation error.
- *Manual `firebase-analytics` Gradle dependency* (per the Firebase console's
  "Add SDK" instructions): rejected — the Capacitor plugin pulls in a current
  `firebase-analytics` automatically via `cap sync`; the console suggested an
  outdated `17.4.1` and would risk a version conflict. The project's Gradle was
  already wired (`google-services` classpath + conditional plugin apply).

**Consequences**:
- A valid `google-services.json` (project `ourpot`, package `com.ourpot.app`) lives
  at `android/app/google-services.json`. It is **not** gitignored and is committed
  so CI builds include it. Its client API key is a normal client-side identifier,
  not a secret.
- The `google-services` Gradle plugin now applies to **all** build variants. The
  dev workflow (`build-android-dev.yml`) rewrites `applicationId` to
  `com.ourpot.app.dev`, which is registered as a **second Android app** in the
  `ourpot` Firebase project. So `google-services.json` contains both clients
  (`com.ourpot.app` and `com.ourpot.app.dev`) and every variant resolves a match.

## [2026-05-30] Disable the "View Debug Logs" button for release (v2.1.0)

**Context**: Settings exposed a "Developer Tools → View Debug Logs" button (behind a
5-tap gesture). We want it out of the shipped release.

**Decision**: Comment out the Developer Tools group, its `handleShowDebugLogs`
handler, and drop the now-unused `getDebugLogs` import in
`components/features/settings/SettingsTab.tsx`. The debug-logs modal markup is left
in place (now unreachable) so the feature can be re-enabled by uncommenting.

**Consequences**: No behavior change for users; the entry point is gone. Lint/build
stay green (no unused symbols introduced).
