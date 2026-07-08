# Sleep Start Alarm

A mobile app (Expo / React Native) that helps you sleep for an **exact** amount of time,
counted from the moment you *actually* fall asleep — not from the moment you set the alarm.

## How it works

1. Pick how long you want to sleep (20 min, 90 min, 6 h, 8 h, or custom).
2. Pick how often the app should check whether you're still awake (5/10/15/30 min or custom).
3. Pick how long you get to respond to each check (30 s / 1 min / 2 min or custom).
4. Tap **Start Sleep Detection**.

The app then asks *"Are you awake?"* out loud (text-to-speech) at every check interval.

- Tap **I'm awake** → you're still awake; the app waits one more interval and asks again.
- Don't respond within the response window → the app assumes you fell asleep **at the moment
  the window expired** and starts the sleep countdown from there.

The alarm rings at `sleep_start_time + selected_sleep_duration`, so you get exactly the
amount of sleep you asked for.

## Features

- Sleep duration / check interval / response timeout pickers with presets and custom values
- Voice prompt via text-to-speech (custom prompt text, selectable voice, volume)
- Three built-in alarm sounds with preview (classic beep, gentle chime, digital)
- Vibration and snooze toggles
- Live countdown screen: current mode, time until next check, time until alarm
- Session state persisted to local storage — minimizing, reopening, or restarting the app
  fast-forwards the session to the correct state (timestamps, not timers)
- Background fallback via scheduled local notifications:
  - an *"Are you awake?"* notification at each check (with an **I'm awake** action button)
  - the alarm notification pre-scheduled at its projected time, so the alarm fires even if
    the app never runs again after you fall asleep
- Dark, minimal, sleep-focused UI

## Required permissions

For checks and the alarm to reach you while the app is backgrounded you must allow:

- **Notifications** (with sound) — the app asks on first launch
- On Android: exempt the app from **battery optimization** if checks seem unreliable

The app shows a warning on the home screen if notifications are not allowed.

## Running it

```bash
cd sleep-start-alarm
npm install
npx expo start
```

Then scan the QR code with the Expo Go app, or run `npm run android` / `npm run ios`.

> Custom notification alarm sounds and Android notification channels require a development
> build (`npx expo run:android` / `run:ios`); inside Expo Go the notification falls back to
> the default system sound. The in-app alarm always uses the selected sound.

## Code layout

```
App.tsx                     — root: settings persistence, permissions, screen switching
src/types.ts                — Settings + Session models, defaults
src/session.ts              — pure, timestamp-based session state machine (unit-testable)
src/useSleepSession.ts      — hook wiring the machine to storage, notifications, TTS, alarm
src/notifications.ts        — permissions, channels, background fallback scheduling
src/audio.ts                — TTS prompt + looping alarm playback (expo-audio / expo-speech)
src/storage.ts              — AsyncStorage load/save for settings and session
src/format.ts               — duration/countdown/clock formatting helpers
src/theme.ts                — colors, spacing, typography
src/components/             — BigButton, OptionSelector (chips + custom value modal)
src/screens/                — HomeScreen, ActiveSessionScreen, SettingsScreen
assets/sounds/              — generated alarm WAVs
```

The session state machine in `src/session.ts` stores absolute timestamps for every deadline
(next check, response window, alarm). `advanceSession(session, now)` chains transitions to
catch up after any amount of downtime, which is what makes the app robust to backgrounding
and process death.
