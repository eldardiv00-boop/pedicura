import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { projectedAlarmAt } from './session';
import { AlarmSoundId, Session, Settings } from './types';

export const AWAKE_CHECK_CATEGORY = 'awake-check';
export const IM_AWAKE_ACTION = 'im-awake';

const ALARM_SOUND_FILES: Record<AlarmSoundId, string> = {
  classic: 'alarm_classic.wav',
  chime: 'alarm_chime.wav',
  digital: 'alarm_digital.wav',
};

/**
 * While the app is foregrounded the session UI handles prompts and the alarm
 * itself (TTS + audio), so OS banners would be duplicate noise.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return asked.granted;
}

export async function configureNotifications(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(AWAKE_CHECK_CATEGORY, [
    {
      identifier: IM_AWAKE_ACTION,
      buttonTitle: "I'm awake",
      options: { opensAppToForeground: false },
    },
  ]);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('awake-check', {
      name: 'Awake checks',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      sound: 'default',
    });
    for (const [id, file] of Object.entries(ALARM_SOUND_FILES)) {
      await Notifications.setNotificationChannelAsync(`alarm-${id}`, {
        name: `Alarm (${id})`,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 300, 600, 300, 600],
        sound: file,
        bypassDnd: true,
      });
    }
  }
}

/**
 * (Re)schedule the background fallback notifications for the current session
 * state. Called on every session transition and when the app backgrounds:
 * - the next "Are you awake?" check, so the phone wakes the user's attention
 *   even if the app is not in the foreground, and
 * - the alarm at its projected time assuming the pending check goes
 *   unanswered, so the alarm still fires if the app never runs again.
 * Responding to a check re-runs this, pushing both notifications forward.
 */
export async function syncSessionNotifications(
  session: Session | null,
  settings: Settings
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!session) return;

  const now = Date.now();

  if (session.phase === 'awaiting_check' && session.nextCheckAt > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: settings.promptText,
        body: `Respond within ${session.responseTimeoutSec >= 60 ? `${Math.round(session.responseTimeoutSec / 60)} min` : `${session.responseTimeoutSec} sec`} or your ${session.sleepDurationMin >= 60 ? `${+(session.sleepDurationMin / 60).toFixed(1)} hour` : `${session.sleepDurationMin} minute`} sleep timer starts.`,
        categoryIdentifier: AWAKE_CHECK_CATEGORY,
        sound: 'default',
        vibrate: settings.vibrationEnabled ? [0, 400, 200, 400] : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(session.nextCheckAt),
        channelId: 'awake-check',
      },
    });
  }

  const alarmAt = projectedAlarmAt(session);
  if (alarmAt !== null && alarmAt > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Wake up!',
        body: 'Your sleep timer has finished.',
        sound: ALARM_SOUND_FILES[settings.alarmSound],
        vibrate: settings.vibrationEnabled ? [0, 600, 300, 600, 300, 600] : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(alarmAt),
        channelId: `alarm-${settings.alarmSound}`,
      },
    });
  }
}

export async function clearAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}
