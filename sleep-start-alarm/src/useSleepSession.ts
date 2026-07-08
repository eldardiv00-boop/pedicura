import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { speakPrompt, startAlarm, stopAlarm } from './audio';
import { clearAllNotifications, IM_AWAKE_ACTION, syncSessionNotifications } from './notifications';
import { advanceSession, createSession, respondAwake, snoozeAlarm } from './session';
import { loadSession, saveSession } from './storage';
import { Session, Settings } from './types';

const TICK_MS = 500;

interface SleepSessionApi {
  session: Session | null;
  sessionLoaded: boolean;
  /** Re-rendered every tick so countdowns stay live. */
  now: number;
  start: (sleepDurationMin: number, checkIntervalMin: number, responseTimeoutSec: number) => void;
  imAwake: () => void;
  stop: () => void;
  snooze: () => void;
}

/**
 * Owns the active session: restores it from storage on launch, advances it on
 * a foreground tick, persists every transition, keeps the background fallback
 * notifications in sync, and fires the phase side effects (voice prompt when
 * a check opens, looping alarm sound when the timer ends).
 */
export function useSleepSession(settings: Settings): SleepSessionApi {
  const [session, setSessionState] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());

  const sessionRef = useRef<Session | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const applySession = useCallback((next: Session | null) => {
    const prev = sessionRef.current;
    sessionRef.current = next;
    setSessionState(next);
    saveSession(next);
    syncSessionNotifications(next, settingsRef.current);

    const prevPhase = prev?.phase ?? null;
    const nextPhase = next?.phase ?? null;
    if (nextPhase !== prevPhase) {
      if (nextPhase === 'prompting' && AppState.currentState === 'active') {
        speakPrompt(settingsRef.current);
      }
      if (nextPhase === 'alarm') {
        startAlarm(settingsRef.current);
      } else if (prevPhase === 'alarm') {
        stopAlarm();
      }
    }
  }, []);

  // Restore a persisted session on launch and fast-forward it to now.
  useEffect(() => {
    let cancelled = false;
    loadSession().then((stored) => {
      if (cancelled) return;
      if (stored) {
        applySession(advanceSession(stored));
      }
      setSessionLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  // Foreground tick: advance the state machine and refresh countdowns.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      setNow(Date.now());
      const current = sessionRef.current;
      if (!current) return;
      const advanced = advanceSession(current);
      if (advanced !== current) {
        applySession(advanced);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [session !== null, applySession]);

  // Catch up immediately when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && sessionRef.current) {
        Notifications.dismissAllNotificationsAsync();
        applySession(advanceSession(sessionRef.current));
      }
    });
    return () => sub.remove();
  }, [applySession]);

  // "I'm awake" tapped on the check notification itself.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier !== IM_AWAKE_ACTION) return;
      const current = sessionRef.current;
      if (!current) return;
      const advanced = advanceSession(current);
      if (advanced.phase === 'awaiting_check' || advanced.phase === 'prompting') {
        applySession(respondAwake(advanced));
      }
    });
    return () => sub.remove();
  }, [applySession]);

  const start = useCallback(
    (sleepDurationMin: number, checkIntervalMin: number, responseTimeoutSec: number) => {
      applySession(createSession(sleepDurationMin, checkIntervalMin, responseTimeoutSec));
    },
    [applySession]
  );

  const imAwake = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    applySession(respondAwake(advanceSession(current)));
  }, [applySession]);

  const stop = useCallback(() => {
    stopAlarm();
    applySession(null);
    clearAllNotifications();
  }, [applySession]);

  const snooze = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    applySession(snoozeAlarm(current, settingsRef.current.snoozeMin));
  }, [applySession]);

  return { session, sessionLoaded, now, start, imAwake, stop, snooze };
}
