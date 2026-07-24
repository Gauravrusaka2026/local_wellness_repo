import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ComplaintLocationCapture } from '@local-wellness/types';

import {
  captureComplaintEvidenceLocation,
  requiresLocationPermissionSettings,
} from '../location/device-location';
import { useLocalization } from '../ui/localization';
import { prepareCapturedVoice, type PreparedComplaintMedia } from './media-service';

export const ComplaintVoiceCapture = ({
  disabled,
  onCaptured,
}: Readonly<{
  disabled: boolean;
  onCaptured: (media: PreparedComplaintMedia, location: ComplaintLocationCapture) => Promise<void>;
}>) => {
  const { t } = useLocalization();
  const [error, setError] = useState<string | null>(null);
  const [finishedUri, setFinishedUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [locationSettingsRequired, setLocationSettingsRequired] = useState(false);
  const [microphoneSettingsRequired, setMicrophoneSettingsRequired] = useState(false);
  const captureStartedAt = useRef<Readonly<{ capturedAt: string; startedAt: number }> | null>(null);
  const processingUri = useRef<string | null>(null);
  const onCapturedRef = useRef(onCaptured);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.hasError) {
      setError(status.error ?? t('voiceRecordingFailed'));
    }
    if (status.isFinished && status.url) {
      setIsProcessing(true);
      setFinishedUri(status.url);
    }
  });
  const recorderState = useAudioRecorderState(recorder, 250);

  useEffect(() => {
    onCapturedRef.current = onCaptured;
  }, [onCaptured]);

  useEffect(() => {
    if (!microphoneSettingsRequired) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void getRecordingPermissionsAsync().then((permission) => {
        if (permission.granted || permission.canAskAgain) {
          setMicrophoneSettingsRequired(false);
          setError(null);
        }
      });
    });
    return () => subscription.remove();
  }, [microphoneSettingsRequired]);

  useEffect(() => {
    if (disabled || finishedUri === null || processingUri.current === finishedUri) return;
    const currentUri = finishedUri;
    processingUri.current = currentUri;

    const processRecording = async (): Promise<void> => {
      const started = captureStartedAt.current;
      const durationMilliseconds = Math.max(
        1,
        Math.min(60_000, Date.now() - (started?.startedAt ?? Date.now())),
      );
      try {
        setLocationSettingsRequired(false);
        const location = await captureComplaintEvidenceLocation();
        const media = await prepareCapturedVoice({
          capturedAt: started?.capturedAt ?? new Date().toISOString(),
          durationMilliseconds,
          uri: currentUri,
        });
        await onCapturedRef.current(media, location);
      } catch (recordingError) {
        setLocationSettingsRequired(requiresLocationPermissionSettings(recordingError));
        setError(
          recordingError instanceof Error ? recordingError.message : t('voiceRecordingFailed'),
        );
      } finally {
        captureStartedAt.current = null;
        processingUri.current = null;
        setFinishedUri((value) => (value === currentUri ? null : value));
        setIsProcessing(false);
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      }
    };

    void processRecording();
  }, [disabled, finishedUri, t]);

  const start = async (): Promise<void> => {
    try {
      setError(null);
      setLocationSettingsRequired(false);
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setMicrophoneSettingsRequired(permission.canAskAgain === false);
        setError(t('microphoneVoiceRequired'));
        return;
      }

      setMicrophoneSettingsRequired(false);
      await setAudioModeAsync({ allowsRecording: true, interruptionMode: 'doNotMix' });
      await recorder.prepareToRecordAsync();
      captureStartedAt.current = {
        capturedAt: new Date().toISOString(),
        startedAt: Date.now(),
      };
      recorder.record({ forDuration: 60 });
    } catch (recordingError) {
      setError(
        recordingError instanceof Error ? recordingError.message : t('voiceRecordingFailed'),
      );
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  };

  const stop = async (): Promise<void> => {
    setIsProcessing(true);
    setError(null);
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error(t('voiceNoFile'));
      setFinishedUri(recorder.uri);
    } catch (recordingError) {
      setError(
        recordingError instanceof Error ? recordingError.message : t('voiceRecordingFailed'),
      );
      setIsProcessing(false);
      captureStartedAt.current = null;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.help}>{t('voicePrivacyHint')}</Text>
      {recorderState.isRecording ? (
        <Text accessibilityLiveRegion="polite" style={styles.recording}>
          {t('recordingProgress', {
            seconds: Math.ceil(recorderState.durationMillis / 1_000),
          })}
        </Text>
      ) : null}
      {error === null ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {locationSettingsRequired || microphoneSettingsRequired ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsButtonText}>
            {t(locationSettingsRequired ? 'openLocationSettings' : 'openMicrophoneSettings')}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={(!recorderState.isRecording && disabled) || isProcessing}
        onPress={() => void (recorderState.isRecording ? stop() : start())}
        style={[styles.button, recorderState.isRecording && styles.stopButton]}
      >
        {isProcessing ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>
            {t(recorderState.isRecording ? 'stopUploadVoice' : 'recordVoice')}
          </Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 9,
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
  },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  container: { gap: 10 },
  error: { color: '#991b1b', lineHeight: 20 },
  help: { color: '#475569', lineHeight: 21 },
  recording: { color: '#991b1b', fontWeight: '700' },
  settingsButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  settingsButtonText: { color: '#166534', fontWeight: '800' },
  stopButton: { backgroundColor: '#991b1b' },
});
