import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Device, DevicePlatform } from '@local-wellness/types';

import { apiRequest } from '../api/client';

const INSTALLATION_IDENTIFIER_KEY = 'local-wellness.device.installation-identifier';

export type RegisteredDevice = Device;

const getDevicePlatform = (): DevicePlatform => {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return Platform.OS;
  }

  return 'web';
};

const getPersistentInstallationIdentifier = async (): Promise<string> => {
  const currentIdentifier = await SecureStore.getItemAsync(INSTALLATION_IDENTIFIER_KEY);

  if (currentIdentifier) {
    return currentIdentifier;
  }

  const newIdentifier = Crypto.randomUUID();
  await SecureStore.setItemAsync(INSTALLATION_IDENTIFIER_KEY, newIdentifier, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return newIdentifier;
};

export const getHashedInstallationIdentifier = async (): Promise<string> => {
  const identifier = await getPersistentInstallationIdentifier();

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, identifier);
};

export const registerCurrentDevice = async (accessToken: string): Promise<RegisteredDevice> => {
  const deviceIdentifier = await getHashedInstallationIdentifier();
  const appVersion = Constants.expoConfig?.version;

  return apiRequest<RegisteredDevice>('/api/v1/me/devices', {
    accessToken,
    body: {
      deviceIdentifier,
      platform: getDevicePlatform(),
      ...(appVersion === undefined ? {} : { appVersion }),
    },
    method: 'POST',
  });
};
