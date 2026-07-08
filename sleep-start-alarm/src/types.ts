export type AlarmSoundId = 'classic' | 'chime' | 'digital';

export interface Settings {
  /** Default check interval in minutes, used to prefill the home screen. */
  defaultCheckIntervalMin: number;
  /** Default response timeout in seconds, used to prefill the home screen. */
  defaultResponseTimeoutSec: number;
  alarmSound: AlarmSoundId;
  promptText: string;
  /** Identifier of the TTS voice, or null for the system default. */
  voiceId: string | null;
  /** 0..1 */
  voiceVolume: number;
  vibrationEnabled: boolean;
  snoozeEnabled: boolean;
  snoozeMin: number;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultCheckIntervalMin: 15,
  defaultResponseTimeoutSec: 60,
  alarmSound: 'classic',
  promptText: 'Are you awake?',
  voiceId: null,
  voiceVolume: 1,
  vibrationEnabled: true,
  snoozeEnabled: true,
  snoozeMin: 5,
};

/**
 * Phases of an active session:
 * - awaiting_check: user is presumed awake; waiting until the next "Are you awake?" check.
 * - prompting: the check fired; waiting for the user to respond within the response window.
 * - sleeping: the user failed to respond; the sleep countdown is running.
 * - alarm: the sleep countdown finished; the alarm is ringing.
 */
export type SessionPhase = 'awaiting_check' | 'prompting' | 'sleeping' | 'alarm';

export interface Session {
  phase: SessionPhase;
  sleepDurationMin: number;
  checkIntervalMin: number;
  responseTimeoutSec: number;
  /** Epoch ms when Start was tapped. */
  startedAt: number;
  /** Epoch ms of the next check. Set while awaiting_check. */
  nextCheckAt: number;
  /** Epoch ms when the current response window closes. Set while prompting. */
  promptExpiresAt: number | null;
  /** Epoch ms when the user was deemed asleep. Set from sleeping onward. */
  sleepStartedAt: number | null;
  /** Epoch ms when the alarm should ring. Set from sleeping onward. */
  alarmAt: number | null;
  snoozeCount: number;
}
