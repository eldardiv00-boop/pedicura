import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BigButton } from '../components/BigButton';
import { OptionSelector } from '../components/OptionSelector';
import { formatMinutes, formatSeconds } from '../format';
import { colors, font, spacing, radius } from '../theme';
import { Settings } from '../types';

const SLEEP_OPTIONS = [
  { value: 20, label: '20 min' },
  { value: 90, label: '90 min' },
  { value: 360, label: '6 hours' },
  { value: 480, label: '8 hours' },
];

const INTERVAL_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

const TIMEOUT_OPTIONS = [
  { value: 30, label: '30 sec' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
];

interface Props {
  settings: Settings;
  permissionsGranted: boolean;
  onStart: (sleepDurationMin: number, checkIntervalMin: number, responseTimeoutSec: number) => void;
  onOpenSettings: () => void;
}

export function HomeScreen({ settings, permissionsGranted, onStart, onOpenSettings }: Props) {
  const [sleepMin, setSleepMin] = useState(480);
  const [intervalMin, setIntervalMin] = useState(settings.defaultCheckIntervalMin);
  const [timeoutSec, setTimeoutSec] = useState(settings.defaultResponseTimeoutSec);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sleep Start Alarm</Text>
          <Text style={styles.subtitle}>The timer starts when you actually fall asleep.</Text>
        </View>
        <Pressable onPress={onOpenSettings} hitSlop={12} style={styles.gear}>
          <Text style={styles.gearIcon}>⚙︎</Text>
        </Pressable>
      </View>

      <OptionSelector
        title="Sleep duration"
        options={SLEEP_OPTIONS}
        value={sleepMin}
        onChange={setSleepMin}
        customUnit="minutes"
        customMin={1}
        customMax={24 * 60}
        formatValue={formatMinutes}
      />

      <OptionSelector
        title="Check if I'm awake every"
        options={INTERVAL_OPTIONS}
        value={intervalMin}
        onChange={setIntervalMin}
        customUnit="minutes"
        customMin={1}
        customMax={180}
        formatValue={formatMinutes}
      />

      <OptionSelector
        title="Time to respond"
        options={TIMEOUT_OPTIONS}
        value={timeoutSec}
        onChange={setTimeoutSec}
        customUnit="seconds"
        customMin={10}
        customMax={600}
        formatValue={formatSeconds}
      />

      <View style={styles.explainer}>
        <Text style={styles.explainerText}>
          Every {formatMinutes(intervalMin)} you'll be asked “{settings.promptText}”. Answer and
          the app keeps waiting. Miss one and your {formatMinutes(sleepMin)} sleep timer starts
          from that moment — the alarm rings exactly {formatMinutes(sleepMin)} after you fell
          asleep.
        </Text>
      </View>

      {!permissionsGranted && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Notifications are not allowed. Without notification, sound, and background
            permissions the checks and the alarm cannot reach you when the app is in the
            background. Please enable them in your system settings.
          </Text>
        </View>
      )}

      <BigButton
        label="Start Sleep Detection"
        onPress={() => onStart(sleepMin, intervalMin, timeoutSec)}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: font.title,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: font.body,
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  gear: {
    padding: spacing.xs,
  },
  gearIcon: {
    color: colors.textSecondary,
    fontSize: 26,
  },
  explainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  explainerText: {
    color: colors.textSecondary,
    fontSize: font.small,
    lineHeight: 19,
  },
  warning: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: {
    color: colors.danger,
    fontSize: font.small,
    lineHeight: 19,
  },
});
