<div align="center">

<img src="public/icon1024.png" alt="OurPot logo" width="96" height="96" />

# OurPot — Expense Jar

**Your AI assistant for the household pot.** Tell it about an expense in plain
language; it drafts the entry, you approve it. No manual forms, no bank linking,
data stays on your device.

[![Live on Google Play](https://img.shields.io/badge/Google%20Play-Live-success?logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.ourpot.app)
&nbsp;
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](https://play.google.com/store/apps/details?id=com.ourpot.app)
&nbsp;
![iOS](https://img.shields.io/badge/iOS-coming%20soon-lightgrey)

### 🎉 Now live on Google Play → [play.google.com/store/apps/details?id=com.ourpot.app](https://play.google.com/store/apps/details?id=com.ourpot.app)

</div>

---

## What is this?

OurPot is an **AI-assisted household expense tracker** built around a simple rule:
**the AI proposes, you approve.** Nothing ever touches your ledger without your
say-so.

- 🤖 **AI proposals** — describe expenses naturally ("Coffee $4.50, groceries $82 at Woolworths") and the assistant drafts categorized entries.
- ✅ **You stay in control** — review, edit, or reject every proposal. Rejected ones are archived, never silently deleted.
- 🔒 **Privacy-first** — expense data lives on-device (encrypted SQLite). The backend only runs AI inference; it never stores your financial data.
- 🏦 **No bank linking** — your accounts are never connected.

## Tech stack

| Layer        | Tech                                                      |
| ------------ | --------------------------------------------------------- |
| App shell    | [Next.js 16](https://nextjs.org) (static export) + React 19 |
| Native       | [Capacitor 8](https://capacitorjs.com) (Android)           |
| Local data   | Capacitor SQLite (on-device, encrypted)                   |
| AI           | Vercel AI SDK → backend inference ([`our-pot-api`](../our-pot-api)) |
| UI           | Tailwind CSS v4, Radix UI, Framer Motion                  |

The propose/approve flow is implemented with a **ChangeSet** pattern: the AI
emits a ChangeSet, the user reviews it, and only approved ChangeSets are committed
to the local database.

## Getting started (development)

```bash
npm install
npm run dev          # web dev server at http://localhost:3000
```

Copy `.env.local.example` to `.env.local` and fill in the backend URL / keys.

### Build the Android app

```bash
npm run build                   # Next.js static export → ./out
npx cap sync android            # copy web assets into the native project
./build-android-production.sh   # signed release build
```

## Project layout

```
app/         Next.js routes & UI
components/   Shared React components
lib/         Data layer, migrations, AI ChangeSet logic
android/     Capacitor Android native project
docs/        Architecture decisions
```

## Related projects

- [`our-pot-api`](../our-pot-api) — Cloudflare Worker backend for AI inference
- [`our-pot-site`](../our-pot-site) — marketing landing page

---

<div align="center">
<sub>© 2026 Kivov Digital · Support: <a href="mailto:support@our-pot.com">support@our-pot.com</a></sub>
</div>
