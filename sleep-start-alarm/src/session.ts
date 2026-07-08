import { Session } from './types';

const MIN = 60_000;
const SEC = 1_000;

export function createSession(
  sleepDurationMin: number,
  checkIntervalMin: number,
  responseTimeoutSec: number,
  now: number = Date.now()
): Session {
  return {
    phase: 'awaiting_check',
    sleepDurationMin,
    checkIntervalMin,
    responseTimeoutSec,
    startedAt: now,
    nextCheckAt: now + checkIntervalMin * MIN,
    promptExpiresAt: null,
    sleepStartedAt: null,
    alarmAt: null,
    snoozeCount: 0,
  };
}

/**
 * Advance the session to what it should be at time `now`, chaining
 * transitions as needed. Because every deadline is an absolute timestamp,
 * this correctly catches up after the app was backgrounded or killed:
 * a missed check window resolves to "asleep" anchored at the moment the
 * response window actually expired, not at the moment the app resumed.
 */
export function advanceSession(session: Session, now: number = Date.now()): Session {
  let s = session;
  for (;;) {
    if (s.phase === 'awaiting_check' && now >= s.nextCheckAt) {
      s = {
        ...s,
        phase: 'prompting',
        promptExpiresAt: s.nextCheckAt + s.responseTimeoutSec * SEC,
      };
    } else if (s.phase === 'prompting' && s.promptExpiresAt !== null && now >= s.promptExpiresAt) {
      const sleepStartedAt = s.promptExpiresAt;
      s = {
        ...s,
        phase: 'sleeping',
        promptExpiresAt: null,
        sleepStartedAt,
        alarmAt: sleepStartedAt + s.sleepDurationMin * MIN,
      };
    } else if (s.phase === 'sleeping' && s.alarmAt !== null && now >= s.alarmAt) {
      s = { ...s, phase: 'alarm' };
    } else {
      return s;
    }
  }
}

/** The user confirmed they are awake: schedule the next check and keep waiting. */
export function respondAwake(session: Session, now: number = Date.now()): Session {
  if (session.phase !== 'awaiting_check' && session.phase !== 'prompting') return session;
  return {
    ...session,
    phase: 'awaiting_check',
    nextCheckAt: now + session.checkIntervalMin * MIN,
    promptExpiresAt: null,
  };
}

/** Snooze a ringing alarm for `snoozeMin` minutes. */
export function snoozeAlarm(session: Session, snoozeMin: number, now: number = Date.now()): Session {
  if (session.phase !== 'alarm') return session;
  return {
    ...session,
    phase: 'sleeping',
    alarmAt: now + snoozeMin * MIN,
    snoozeCount: session.snoozeCount + 1,
  };
}

/**
 * The moment the alarm would ring if the user never responds to the pending
 * check — used to pre-schedule the alarm notification while the app may be
 * backgrounded. Null once the session has ended in the ringing state.
 */
export function projectedAlarmAt(session: Session): number | null {
  switch (session.phase) {
    case 'awaiting_check':
      return session.nextCheckAt + session.responseTimeoutSec * SEC + session.sleepDurationMin * MIN;
    case 'prompting':
      return (session.promptExpiresAt ?? 0) + session.sleepDurationMin * MIN;
    case 'sleeping':
      return session.alarmAt;
    case 'alarm':
      return null;
  }
}
