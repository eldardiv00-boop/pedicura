import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { previewAlarmSound, speakPrompt } from '../audio';
import { OptionSelector } from '../components/OptionSelector';
import { formatMinutes, formatSeconds } from '../format';
import { colors, font, radius, spacing } from '../theme';
import { AlarmSoundId, Settings } from '../types';

const ALARM_SOUNDS: { id: AlarmSoundId; label: string }[] = [
  { id: 'classic', label: 'Classic beep' },
  { id: 'chime', label: 'Gentle chime' },
  { id: 'digital', label: 'Digital' },
];

const VOLUME_OPTIONS = [0.25, 0.5, 0.75, 1];

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
  onChange: (settings: Settings) => void;
  onBack: () => void;
}

export function SettingsScreen({ settings, onChange, onBack }: Props) {
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [voiceModal, setVoiceModal] = useState(false);

  useEffect(() => {
    Speech.getAvailableVoicesAsync()
      .then(setVoices)
      .catch(() => setVoices([]));
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  const selectedVoice = voices.find((v) => v.identifier === settings.voiceId);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.sectionTitle}>Alarm sound</Text>
      <View style={styles.chips}>
        {ALARM_SOUNDS.map((s) => (
          <Chip
            key={s.id}
            label={s.label}
            selected={settings.alarmSound === s.id}
            onPress={() => {
              set('alarmSound', s.id);
              previewAlarmSound(s.id);
            }}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Voice prompt text</Text>
      <TextInput
        style={styles.input}
        value={settings.promptText}
        onChangeText={(t) => set('promptText', t)}
        placeholder="Are you awake?"
        placeholderTextColor={colors.textDim}
      />

      <Text style={styles.sectionTitle}>Voice</Text>
      <Pressable style={styles.voiceRow} onPress={() => setVoiceModal(true)}>
        <Text style={styles.voiceName}>
          {selectedVoice ? `${selectedVoice.name} (${selectedVoice.language})` : 'System default'}
        </Text>
        <Text style={styles.voiceChevron}>›</Text>
      </Pressable>
      <Pressable style={styles.testVoice} onPress={() => speakPrompt(settings)}>
        <Text style={styles.testVoiceLabel}>▶ Test voice prompt</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Voice volume</Text>
      <View style={styles.chips}>
        {VOLUME_OPTIONS.map((v) => (
          <Chip
            key={v}
            label={`${Math.round(v * 100)}%`}
            selected={settings.voiceVolume === v}
            onPress={() => set('voiceVolume', v)}
          />
        ))}
      </View>

      <ToggleRow
        label="Vibration"
        value={settings.vibrationEnabled}
        onChange={(v) => set('vibrationEnabled', v)}
      />
      <ToggleRow
        label={`Snooze (${settings.snoozeMin} min)`}
        value={settings.snoozeEnabled}
        onChange={(v) => set('snoozeEnabled', v)}
      />

      <View style={{ height: spacing.lg }} />

      <OptionSelector
        title="Default check interval"
        options={INTERVAL_OPTIONS}
        value={settings.defaultCheckIntervalMin}
        onChange={(v) => set('defaultCheckIntervalMin', v)}
        customUnit="minutes"
        customMin={1}
        customMax={180}
        formatValue={formatMinutes}
      />
      <OptionSelector
        title="Default response timeout"
        options={TIMEOUT_OPTIONS}
        value={settings.defaultResponseTimeoutSec}
        onChange={(v) => set('defaultResponseTimeoutSec', v)}
        customUnit="seconds"
        customMin={10}
        customMax={600}
        formatValue={formatSeconds}
      />

      <Text style={styles.footnote}>
        For checks and the alarm to work while the app is in the background, allow
        notifications and sound, and disable battery optimization for this app if your phone
        has it.
      </Text>

      <Modal transparent visible={voiceModal} animationType="fade" onRequestClose={() => setVoiceModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVoiceModal(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Voice</Text>
            <FlatList
              data={[null, ...voices] as (Speech.Voice | null)[]}
              keyExtractor={(v) => v?.identifier ?? 'default'}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.voiceOption}
                  onPress={() => {
                    const next = { ...settings, voiceId: item?.identifier ?? null };
                    onChange(next);
                    setVoiceModal(false);
                    speakPrompt(next);
                  }}
                >
                  <Text
                    style={[
                      styles.voiceOptionLabel,
                      (item?.identifier ?? null) === settings.voiceId && { color: colors.accent },
                    ]}
                  >
                    {item ? `${item.name} (${item.language})` : 'System default'}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.textPrimary}
      />
    </View>
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
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  back: {
    color: colors.accent,
    fontSize: font.body,
    fontWeight: '600',
    width: 60,
  },
  title: {
    color: colors.textPrimary,
    fontSize: font.heading,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: font.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: font.body,
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: colors.accent,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: font.body,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  voiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  voiceName: {
    color: colors.textPrimary,
    fontSize: font.body,
  },
  voiceChevron: {
    color: colors.textSecondary,
    fontSize: font.heading,
  },
  testVoice: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  testVoiceLabel: {
    color: colors.accent,
    fontSize: font.body,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: font.body,
    fontWeight: '600',
  },
  footnote: {
    color: colors.textDim,
    fontSize: font.small,
    lineHeight: 19,
    marginTop: spacing.xl,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: font.heading,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  voiceOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  voiceOptionLabel: {
    color: colors.textPrimary,
    fontSize: font.body,
  },
});
