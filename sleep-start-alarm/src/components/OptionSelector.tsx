import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, font, radius, spacing } from '../theme';

interface Option {
  value: number;
  label: string;
}

interface Props {
  title: string;
  options: Option[];
  value: number;
  onChange: (value: number) => void;
  /** Label shown next to the custom input, e.g. "minutes". */
  customUnit: string;
  /** Convert the number typed in the custom input to the option value. */
  customMin?: number;
  customMax?: number;
  formatValue: (value: number) => string;
}

/**
 * A titled row of selectable chips plus a "Custom" chip that opens a numeric
 * input. Used for sleep duration, check interval, and response timeout.
 */
export function OptionSelector({
  title,
  options,
  value,
  onChange,
  customUnit,
  customMin = 1,
  customMax = 24 * 60,
  formatValue,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState('');

  const isPreset = options.some((o) => o.value === value);

  const submitCustom = () => {
    const n = Math.round(Number(draft));
    if (Number.isFinite(n) && n >= customMin && n <= customMax) {
      onChange(n);
      setModalVisible(false);
      setDraft('');
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={o.value === value}
            onPress={() => onChange(o.value)}
          />
        ))}
        <Chip
          label={isPreset ? 'Custom' : `Custom: ${formatValue(value)}`}
          selected={!isPreset}
          onPress={() => {
            setDraft(String(value));
            setModalVisible(true);
          }}
        />
      </View>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={draft}
                onChangeText={setDraft}
                autoFocus
                placeholder={`${customMin}–${customMax}`}
                placeholderTextColor={colors.textDim}
                onSubmitEditing={submitCustom}
              />
              <Text style={styles.unit}>{customUnit}</Text>
            </View>
            <Pressable style={styles.confirm} onPress={submitCustom}>
              <Text style={styles.confirmLabel}>Set</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textSecondary,
    fontSize: font.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: font.heading,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  unit: {
    color: colors.textSecondary,
    fontSize: font.body,
  },
  confirm: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmLabel: {
    color: '#0B1120',
    fontSize: font.body,
    fontWeight: '700',
  },
});
