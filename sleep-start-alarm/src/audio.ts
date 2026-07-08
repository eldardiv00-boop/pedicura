import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';
import { AlarmSoundId, Settings } from './types';

const ALARM_SOURCES: Record<AlarmSoundId, number> = {
  classic: require('../assets/sounds/alarm_classic.wav'),
  chime: require('../assets/sounds/alarm_chime.wav'),
  digital: require('../assets/sounds/alarm_digital.wav'),
};

let alarmPlayer: AudioPlayer | null = null;

export async function initAudio(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
  } catch {
    // Non-fatal: alarm falls back to the scheduled notification sound.
  }
}

/** Speak the "Are you awake?" prompt via TTS. */
export function speakPrompt(settings: Settings): void {
  Speech.stop();
  Speech.speak(settings.promptText, {
    voice: settings.voiceId ?? undefined,
    volume: settings.voiceVolume,
  });
  if (settings.vibrationEnabled) {
    Vibration.vibrate([0, 400, 200, 400]);
  }
}

/** Start the looping in-app alarm sound (foreground alarm). */
export function startAlarm(settings: Settings): void {
  stopAlarm();
  const player = createAudioPlayer(ALARM_SOURCES[settings.alarmSound]);
  player.loop = true;
  player.volume = 1;
  player.play();
  alarmPlayer = player;
  if (settings.vibrationEnabled) {
    Vibration.vibrate([0, 600, 300, 600, 300], true);
  }
}

export function stopAlarm(): void {
  Vibration.cancel();
  if (alarmPlayer) {
    try {
      alarmPlayer.pause();
      alarmPlayer.remove();
    } catch {
      // Player may already have been released.
    }
    alarmPlayer = null;
  }
}

/** Preview a sound from the settings screen (plays once, not looped). */
export function previewAlarmSound(sound: AlarmSoundId): void {
  stopAlarm();
  const player = createAudioPlayer(ALARM_SOURCES[sound]);
  player.volume = 1;
  player.play();
  alarmPlayer = player;
}
