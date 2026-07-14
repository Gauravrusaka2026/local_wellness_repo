import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComplaintLocationCapture } from '@local-wellness/types';

import { captureCurrentLocation } from './location-service';
import {
  prepareCapturedPhoto,
  prepareCapturedVideo,
  type PreparedComplaintMedia,
} from './media-service';

type CameraMode = 'photo' | 'video';

export const ComplaintCameraCapture = ({
  onCancel,
  onCaptured,
}: Readonly<{
  onCancel: () => void;
  onCaptured: (media: PreparedComplaintMedia, location: ComplaintLocationCapture) => Promise<void>;
}>) => {
  const camera = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<CameraMode>('photo');
  const videoStartedAt = useRef<number | null>(null);

  const takePhoto = async (): Promise<void> => {
    if (!camera.current || !isCameraReady) return;
    setError(null);
    setIsProcessing(true);
    try {
      const capturedAt = new Date().toISOString();
      const picture = await camera.current.takePictureAsync({ quality: 0.9, shutterSound: true });
      const [media, location] = await Promise.all([
        prepareCapturedPhoto({
          capturedAt,
          height: picture.height,
          uri: picture.uri,
          width: picture.width,
        }),
        captureCurrentLocation(),
      ]);
      await onCaptured(media, location);
      onCancel();
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Photo capture failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const recordVideo = async (): Promise<void> => {
    if (!camera.current || !isCameraReady) return;
    setError(null);
    const microphone =
      microphonePermission?.granted === true
        ? microphonePermission
        : await requestMicrophonePermission();
    if (!microphone.granted) {
      setError('Microphone permission is required for a complaint video.');
      return;
    }

    setIsRecording(true);
    videoStartedAt.current = Date.now();
    try {
      const capturedAt = new Date().toISOString();
      const recording = await camera.current.recordAsync({
        maxDuration: 15,
        maxFileSize: 50 * 1_024 * 1_024,
      });
      if (!recording) return;
      setIsProcessing(true);
      const durationMilliseconds = Math.max(1, Date.now() - (videoStartedAt.current ?? Date.now()));
      const [media, location] = await Promise.all([
        prepareCapturedVideo({ capturedAt, durationMilliseconds, uri: recording.uri }),
        captureCurrentLocation(),
      ]);
      await onCaptured(media, location);
      onCancel();
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Video capture failed.');
    } finally {
      videoStartedAt.current = null;
      setIsProcessing(false);
      setIsRecording(false);
    }
  };

  if (cameraPermission === null) {
    return <ActivityIndicator accessibilityLabel="Checking camera permission" color="#166534" />;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionPanel}>
        <Text style={styles.help}>
          Camera access is used only for evidence you choose to submit.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void requestCameraPermission()}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Allow camera</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        facing="back"
        mode={mode === 'photo' ? 'picture' : 'video'}
        mute={false}
        onCameraReady={() => setIsCameraReady(true)}
        onMountError={({ message }) => setError(message)}
        ref={camera}
        style={styles.camera}
      />
      <View style={styles.modeRow}>
        {(['photo', 'video'] as const).map((candidate) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{
              checked: mode === candidate,
              disabled: isRecording || isProcessing,
            }}
            disabled={isRecording || isProcessing}
            key={candidate}
            onPress={() => setMode(candidate)}
            style={[styles.modeButton, mode === candidate && styles.modeButtonSelected]}
          >
            <Text style={styles.modeButtonText}>
              {candidate === 'photo' ? 'Photo' : 'Video (15s)'}
            </Text>
          </Pressable>
        ))}
      </View>
      {error === null ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isRecording || isProcessing}
          onPress={onCancel}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        {mode === 'photo' ? (
          <Pressable
            accessibilityRole="button"
            disabled={!isCameraReady || isProcessing}
            onPress={() => void takePhoto()}
            style={styles.primaryButton}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Capture photo</Text>
            )}
          </Pressable>
        ) : isRecording ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => camera.current?.stopRecording()}
            style={styles.stopButton}
          >
            <Text style={styles.primaryButtonText}>Stop video</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={!isCameraReady || isProcessing}
            onPress={() => void recordVideo()}
            style={styles.primaryButton}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Record video</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  camera: { borderRadius: 14, height: 390, overflow: 'hidden' },
  container: { gap: 12 },
  error: { color: '#991b1b', lineHeight: 20 },
  help: { color: '#475569', lineHeight: 22 },
  modeButton: { borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, flex: 1, padding: 10 },
  modeButtonSelected: { backgroundColor: '#dcfce7', borderColor: '#166534' },
  modeButtonText: { color: '#1e293b', fontWeight: '700', textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 8 },
  permissionPanel: { gap: 12, padding: 18 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#166534',
    borderRadius: 9,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#166534',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
  },
  secondaryButtonText: { color: '#166534', fontWeight: '700' },
  stopButton: {
    alignItems: 'center',
    backgroundColor: '#991b1b',
    borderRadius: 9,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
  },
});
