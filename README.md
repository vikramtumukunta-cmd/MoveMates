# MoveMates

A minimal, game-style fitness app for competing with friends on steps and active calories, whatever device each person wears.

- **iPhone** reads from **Apple Health** (iPhone, Apple Watch, and anything that syncs to Apple Health: Fitbit, Garmin Connect, Oura, Whoop, etc.)
- **Android** reads from **Health Connect** (Samsung Health, Fitbit, Google Fit, Garmin, Oura, Whoop, etc.)
- **Web** shows generated demo numbers so you can preview the UI in a browser.

Stack: Expo (React Native, SDK 58) + Expo Router, Supabase (Postgres, auth, realtime).

## What's in the MVP

| Feature | Where |
| --- | --- |
| Today: steps, active kcal, goal progress, streak, live friends leaderboard, share | `src/app/(tabs)/index.tsx` |
| Battles: **daily battle** (each day is a round, most rounds won wins) and **leaderboard** (highest total wins), steps or active kcal, 3/7/14 days or this week | `src/app/(tabs)/challenges.tsx`, `src/app/challenge/*` |
| Friends: search by username, requests, accept/remove | `src/app/(tabs)/friends.tsx` |
| Me: avatar, daily goal, badges, data source status | `src/app/(tabs)/profile.tsx` |
| Health reading per platform | `src/lib/health/index.{ios,android}.ts` |
| Sync to Supabase (foreground, every 60s while open, on HealthKit change, and a ~15 min background task) | `src/lib/sync.ts`, `src/lib/syncContext.tsx`, `src/lib/backgroundSync.ts` |
| Database, security rules, leaderboard function | `supabase/migrations/0001_init.sql` |

## How "real time" works (honest version)

Apple Health and Health Connect only live on the phone; neither has a cloud API. Each person's phone reads its own totals and uploads them, and everyone else's leaderboard updates instantly over Supabase Realtime. So the delay is:

1. **Wearable to phone**: depends on the wearable's app (Apple Watch: near instant; Fitbit/Garmin/Whoop/Samsung: when their app syncs, usually every few minutes to an hour).
2. **Phone to MoveMates**: immediate while the app is open; in the background iOS and Android decide when to wake the app (roughly every 15 minutes to an hour).

Both health stores de-duplicate overlapping data (e.g. phone + watch), so steps aren't double counted.

## Setup

### 1. Supabase

The Supabase project **MoveMates** (`mtrrrpglftohksaphujw`, us-east-2) is already set up with `supabase/migrations/0001_init.sql`. The app's public keys are in `eas.json` and `.env.example`.

To start fresh on a new project instead: run the migration in the SQL Editor, then put that project's URL and publishable key in `.env` and `eas.json`.

### 2. Android test build (no Android Studio needed)

```bash
npm install
npx eas-cli@latest login                     # free Expo account
npx eas-cli@latest build --profile preview --platform android
```

When the cloud build finishes (about 10–20 minutes), open the link it prints on your Android phone, download the APK and install it (allow "install unknown apps" if asked). Then open MoveMates, create an account, and tap **Connect** to allow Health Connect.

### 3. Run it locally

```bash
npm install
npx expo start --web            # UI preview in the browser with demo data
```

Health data needs a **development build** (it won't work in Expo Go):

```bash
# Android (phone with Health Connect; Android 14+ has it built in)
npx expo run:android            # or: npx eas-cli@latest build --profile development --platform android

# iOS (needs a Mac with Xcode, or EAS; an Apple Developer account for a real device)
npx expo run:ios --device       # or: npx eas-cli@latest build --profile development --platform ios
```

### 4. Connect wearables

Each person turns on syncing in their wearable's own app:

- Fitbit / Garmin Connect / Whoop / Oura on iPhone → enable "Apple Health" in that app's settings.
- Samsung Health / Fitbit / Garmin / Whoop / Oura on Android → enable "Health Connect" in that app's settings.

## Before publishing

- Google Play requires a Health Connect data declaration in the Play Console (review can take ~1–2 weeks).
- Apple requires a privacy policy and HealthKit usage explanation for App Store review.

## Ideas after the MVP

- Direct Whoop / Fitbit / Garmin cloud APIs (server-side webhooks) for people who don't sync to their phone's health store, or an aggregator such as Terra.
- Push notifications ("Maya just passed you").
- 1v1 duels and team goals.

## Scripts

```bash
npm run typecheck
```
