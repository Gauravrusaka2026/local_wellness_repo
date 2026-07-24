import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLocalization } from '../ui/localization';

export type TaxonomyDropdownOption = Readonly<{
  description?: string | undefined;
  label: string;
  statusLabel?: string | undefined;
  value: string;
}>;

type TaxonomyDropdownProps = Readonly<{
  disabled?: boolean;
  label: string;
  onSelect: (value: string) => void;
  options: readonly TaxonomyDropdownOption[];
  placeholder: string;
  value: string | null;
}>;

export const TaxonomyDropdown = ({
  disabled = false,
  label,
  onSelect,
  options,
  placeholder,
  value,
}: TaxonomyDropdownProps) => {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  const close = (): void => setIsOpen(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityHint={t('openChoices', { label })}
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: isOpen }}
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        style={[styles.trigger, disabled && styles.disabled]}
      >
        <Text style={[styles.triggerText, selected === null && styles.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <Text accessibilityElementsHidden style={styles.chevron}>
          ▾
        </Text>
      </Pressable>

      <Modal animationType="fade" onRequestClose={close} transparent visible={isOpen}>
        <View accessibilityViewIsModal style={styles.overlay}>
          <Pressable
            accessibilityLabel={t('closeChoices', { label })}
            accessibilityRole="button"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityRole="menu" style={styles.dialog}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                {label}
              </Text>
              <Pressable
                accessibilityLabel={t('closeChoices', { label })}
                accessibilityRole="button"
                hitSlop={10}
                onPress={close}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>{t('close')}</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.options} keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    accessibilityHint={option.description}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      close();
                    }}
                    style={[styles.option, isSelected && styles.optionSelected]}
                  >
                    <View style={styles.optionHeading}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      {isSelected ? (
                        <Text accessibilityLabel={t('selected')} style={styles.selectedMark}>
                          ✓
                        </Text>
                      ) : null}
                    </View>
                    {option.description ? (
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    ) : null}
                    {option.statusLabel ? (
                      <Text
                        style={[
                          styles.status,
                          option.statusLabel === t('readyToSubmit')
                            ? styles.statusReady
                            : styles.statusPending,
                        ]}
                      >
                        {option.statusLabel}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  chevron: { color: '#0b6fa4', fontSize: 20, fontWeight: '900' },
  closeButton: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 4 },
  closeText: { color: '#166534', fontWeight: '800' },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    maxHeight: '76%',
    overflow: 'hidden',
    width: '100%',
  },
  disabled: { opacity: 0.45 },
  field: { gap: 7 },
  header: {
    alignItems: 'center',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  label: { color: '#1e293b', fontSize: 15, fontWeight: '800' },
  option: {
    borderColor: '#dce5df',
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    minHeight: 56,
    padding: 14,
  },
  optionDescription: { color: '#64748b', lineHeight: 19 },
  optionHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  optionLabel: { color: '#1e293b', flex: 1, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  optionSelected: { backgroundColor: '#eef9f1', borderColor: '#16834a', borderWidth: 2 },
  options: { gap: 9, padding: 16 },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  placeholder: { color: '#64748b', fontWeight: '500' },
  selectedMark: { color: '#16834a', fontSize: 18, fontWeight: '900' },
  status: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPending: { backgroundColor: '#fff4e6', color: '#b45309' },
  statusReady: { backgroundColor: '#e7f7ec', color: '#166534' },
  title: { color: '#14281d', flex: 1, fontSize: 20, fontWeight: '900' },
  trigger: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  triggerText: { color: '#0f172a', flex: 1, fontSize: 16, fontWeight: '700', paddingRight: 10 },
});
