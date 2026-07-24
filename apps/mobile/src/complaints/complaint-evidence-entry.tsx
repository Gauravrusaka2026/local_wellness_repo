import type { ComplaintLocationCapture } from '@local-wellness/types';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComplaintCameraCapture } from './camera-capture';
import type { PreparedComplaintMedia } from './media-service';
import { ComplaintVoiceCapture } from './voice-capture';
import { useLocalization } from '../ui/localization';

type EvidenceEntryMode = 'closed' | 'menu' | 'camera' | 'voice';

export const ComplaintEvidenceEntry = ({
  disabled,
  onCaptured,
  photoVideoDisabled = false,
}: Readonly<{
  disabled: boolean;
  onCaptured: (media: PreparedComplaintMedia, location: ComplaintLocationCapture) => Promise<void>;
  photoVideoDisabled?: boolean;
}>) => {
  const { t } = useLocalization();
  const [mode, setMode] = useState<EvidenceEntryMode>('closed');

  const uploadAndClose = async (
    media: PreparedComplaintMedia,
    location: ComplaintLocationCapture,
  ): Promise<void> => {
    await onCaptured(media, location);
    setMode('closed');
  };

  if (mode === 'camera') {
    return (
      <ComplaintCameraCapture
        disabled={disabled || photoVideoDisabled}
        onCancel={() => setMode('closed')}
        onCaptured={uploadAndClose}
      />
    );
  }

  if (mode === 'voice') {
    return (
      <View style={styles.capturePanel}>
        <ComplaintVoiceCapture disabled={disabled} onCaptured={uploadAndClose} />
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => setMode('menu')}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>{t('chooseAnotherEvidence')}</Text>
        </Pressable>
      </View>
    );
  }

  if (mode === 'menu') {
    return (
      <View accessibilityLabel={t('evidenceOptions')} style={styles.menu}>
        <Text style={styles.menuTitle}>{t('addEvidence')}</Text>
        <Text style={styles.menuHelp}>{t('chooseEvidenceOption')}</Text>
        <View style={styles.optionRow}>
          <EvidenceOption
            disabled={disabled || photoVideoDisabled}
            glyph="▣"
            label={t('photoOrVideo')}
            onPress={() => setMode('camera')}
          />
          <EvidenceOption
            disabled={disabled}
            glyph="●"
            label={t('voiceNote')}
            onPress={() => setMode('voice')}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => setMode('closed')}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={t('evidenceButtonHint')}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => setMode('menu')}
      style={[styles.addButton, disabled && styles.disabled]}
    >
      <Text accessibilityElementsHidden style={styles.addGlyph}>
        +
      </Text>
      <Text style={styles.addButtonText}>{t('addEvidence')}</Text>
    </Pressable>
  );
};

const EvidenceOption = ({
  disabled,
  glyph,
  label,
  onPress,
}: Readonly<{
  disabled: boolean;
  glyph: string;
  label: string;
  onPress: () => void;
}>) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={[styles.option, disabled && styles.disabled]}
  >
    <View style={styles.optionGlyph}>
      <Text accessibilityElementsHidden style={styles.optionGlyphText}>
        {glyph}
      </Text>
    </View>
    <Text style={styles.optionLabel}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: '#17683b',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  addButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  addGlyph: { color: '#ffffff', fontSize: 20, fontWeight: '500', lineHeight: 22 },
  cancelButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  cancelButtonText: { color: '#17683b', fontWeight: '800' },
  capturePanel: { gap: 8 },
  disabled: { opacity: 0.45 },
  menu: {
    backgroundColor: '#f5faf6',
    borderColor: '#cfe3d5',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  menuHelp: { color: '#52665a', fontSize: 13, lineHeight: 19 },
  menuTitle: { color: '#173b27', fontSize: 18, fontWeight: '900' },
  option: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d5e3d9',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 92,
    justifyContent: 'center',
    padding: 12,
  },
  optionGlyph: {
    alignItems: 'center',
    backgroundColor: '#e8f5ec',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  optionGlyphText: { color: '#17683b', fontSize: 18, fontWeight: '900' },
  optionLabel: { color: '#244331', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  optionRow: { flexDirection: 'row', gap: 10 },
});
