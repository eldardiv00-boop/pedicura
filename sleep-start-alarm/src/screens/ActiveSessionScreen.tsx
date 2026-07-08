import { useKeepAwake } from 'expo-keep-awake';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BigButton } from '../components/BigButton';
import { formatClockTime, formatCountdown, formatMinutes } from '../format';
import { colors, font, radius, spacing } from '../theme';
import { Session, Settings } from '../types';

interface Props {
  session: Session;
  settings: Settings;
  now: number;
  onImAwake: () => void;
  onStop: () => void;
  onSnooze: () => void;
}

export function ActiveSessionScreen({ session, settings, now, onImAwake, onStop, onSnooze }: Props) {
  useKeepAwake();

  const { phase } = session;

  let statusLine: string;
  let bigLabel: string;
  let bigValue: string;
  let subline: string | null = null;

  if (phase === 'awaiting_check') {
    statusLine = 'Checking if you are awake';
    bigLabel = 'Next check in';
    bigValue = formatCountdown(session.nextCheckAt - now);
    subline = `Miss a check and your ${formatMinutes(session.sleepDurationMin)} sleep timer starts.`;
  } else if (phase === 'prompting') {
    statusLine = settings.promptText;
    bigLabel = 'Respond within';
    bigValue = formatCountdown((session.promptExpiresAt ?? now) - now);
    subline = 'No answer means you are asleep — the sleep timer will start.';
  } else if (phase === 'sleeping') {
    statusLine = 'Sleep timer started';
    bigLabel = 'Alarm in';
    bigValue = formatCountdown((session.alarmAt ?? now) - now);
    subline = session.alarmAt ? `Alarm at ${formatClockTime(session.alarmAt)}` : null;
  } else {
    statusLine = 'Wake up!';
    bigLabel = 'Your sleep timer has finished';
    bigValue = formatCountdown(0);
    subline = session.sleepStartedAt
      ? `Asleep since ${formatClockTime(session.sleepStartedAt)}`
      : null;
  }

  const isPrompting = phase === 'prompting';
  const isAlarm = phase === 'alarm';

  return (
    <View style={styles.root}>
      <View style={[styles.statusBadge, isPrompting && styles.statusBadgePrompting, isAlarm && styles.statusBadgeAlarm]}>
        <Text
          style={[styles.statusText, isPrompting && styles.statusTextPrompting, isAlarm && styles.statusTextAlarm]}
        >
          {statusLine}
        </Text>
      </View>

      <View style={styles.center}>
        <Text style={styles.bigLabel}>{bigLabel}</Text>
        {!isAlarm && <Text style={styles.bigValue}>{bigValue}</Text>}
        {isAlarm && <Text style={styles.alarmEmoji}>⏰</Text>}
        {subline && <Text style={styles.subline}>{subline}</Text>}

        {phase === 'sleeping' && session.snoozeCount > 0 && (
          <Text style={styles.subline}>Snoozed ×{session.snoozeCount}</Text>
        )}
      </View>

      <View style={styles.actions}>
        {(phase === 'awaiting_check' || phase === 'prompting') && (
          <BigButton label="I'm awake" onPress={onImAwake} />
        )}
        {isAlarm && settings.snoozeEnabled && (
          <BigButton label={`Snooze ${settings.snoozeMin} min`} onPress={onSnooze} />
        )}
        <BigButton
          label={isAlarm ? 'Stop alarm' : 'Stop'}
          onPress={onStop}
          variant="danger"
          style={{ marginTop: spacing.md }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  statusBadge: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statusBadgePrompting: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  statusBadgeAlarm: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: font.body,
    fontWeight: '600',
  },
  statusTextPrompting: {
    color: colors.accent,
  },
  statusTextAlarm: {
    color: colors.danger,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigLabel: {
    color: colors.textSecondary,
    fontSize: font.heading,
    marginBottom: spacing.sm,
  },
  bigValue: {
    color: colors.textPrimary,
    fontSize: font.huge,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  alarmEmoji: {
    fontSize: 72,
  },
  subline: {
    color: colors.textDim,
    fontSize: font.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  actions: {
    paddingBottom: spacing.lg,
  },
});
