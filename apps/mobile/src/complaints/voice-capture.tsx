import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComplaintLocationCapture } from '@local-wellness/types';

import { captureCurrentLocation } from './location-service';
import { prepareCapturedVoice, type PreparedComplaintMedia } from './media-service';

export const ComplaintVoiceCapture = ({
  disabled,
  onCaptured,
}: Readonly<{
  disabled: boolean;
  onCaptured: (media: PreparedComplaintMedia, location: ComplaintLocationCapture) => Promise<void>;
}>) => {
  const [error, setError] = useState<string | null>(null);
  const [finishedUri, setFinishedUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const captureStartedAt = useRef<Readonly<{ capturedAt: string; startedAt: number }> | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.hasError) {
      setError(status.error ?? 'Voice recording failed.');
    }
    if (status.isFinished && status.url) {
      setIsProcessing(true);
      setFinishedUri(status.url);
    }
  });
  const recorderState = useAudioRecorderState(recorder, 250);

  useEffect(() => {
    if (finishedUri === null) return;

    const processRecording = async (): Promise<void> => {
      const started = captureStartedAt.current;
      const durationMilliseconds = Math.max(
        1,
        Math.min(60_000, Date.now() - (started?.startedAt ?? Date.now())),
      );
      try {
        const [media, location] = await Promise.all([
          prepareCapturedVoice({
            capturedAt: started?.capturedAt ?? new Date().toISOString(),
            durationMilliseconds,
            uri: finishedUri,
          }),
          captureCurrentLocation(),
        ]);
        await onCaptured(media, location);
      } catch (recordingError) {
        setError(
          recordingError instanceof Error ? recordingError.message : 'Voice recording failed.',
        );
      } finally {
        captureStartedAt.current = null;
        setFinishedUri(null);
        setIsProcessing(false);
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      }
    };

    void processRecording();
  }, [finishedUri, onCaptured]);

  const start = async (): Promise<void> => {
    try {
      setError(null);
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required to record private voice evidence.');
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, interruptionMode: 'doNotMix' });
      await recorder.prepareToRecordAsync();
      captureStartedAt.current = {
        capturedAt: new Date().toISOString(),
        startedAt: Date.now(),
      };
      recorder.record({ forDuration: 60 });
    } catch (recordingError) {
      setError(
        recordingError instanceof Error ? recordingError.message : 'Voice recording failed.',
      );
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  };

  const stop = async (): Promise<void> => {
    setIsProcessing(true);
    setError(null);
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error('The voice recording did not produce a file.');
      setFinishedUri(recorder.uri);
    } catch (recordingError) {
      setError(
        recordingError instanceof Error ? recordingError.message : 'Voice recording failed.',
      );
      setIsProcessing(false);
      captureStartedAt.current = null;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.help}>
        Automatic transcription is not configured. The recording remains private evidence; type and
        confirm the description yourself before submitting.
      </Text>
      {recorderState.isRecording ? (
        <Text accessibilityLiveRegion="polite" style={styles.recording}>
          Recording… {Math.ceil(recorderState.durationMillis / 1_000)}s / 60s
        </Text>
      ) : null}
      {error === null ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={disabled || isProcessing}
        onPress={() => void (recorderState.isRecording ? stop() : start())}
        style={[styles.button, recorderState.isRecording && styles.stopButton]}
      >
        {isProcessing ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>
            {recorderState.isRecording ? 'Stop and upload voice' : 'Record voice (60s max)'}
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
  stopButton: { backgroundColor: '#991b1b' },
});
