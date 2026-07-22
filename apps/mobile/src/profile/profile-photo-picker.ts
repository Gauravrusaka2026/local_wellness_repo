import type {
  CameraPermissionResponse,
  ImagePickerAsset,
  ImagePickerOptions,
  ImagePickerResult,
  MediaLibraryPermissionResponse,
} from 'expo-image-picker';

export type ProfilePhotoSource = 'camera' | 'library';

export interface ProfilePhotoPicker {
  launchCameraAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  requestCameraPermissionsAsync(): Promise<CameraPermissionResponse>;
  requestMediaLibraryPermissionsAsync(writeOnly?: boolean): Promise<MediaLibraryPermissionResponse>;
}

export class ProfilePhotoSelectionError extends Error {
  public readonly requiresAppSettings: boolean;
  public readonly source: ProfilePhotoSource;

  public constructor(
    message: string,
    source: ProfilePhotoSource,
    options: Readonly<{ requiresAppSettings?: boolean }> = {},
  ) {
    super(message);
    this.name = 'ProfilePhotoSelectionError';
    this.requiresAppSettings = options.requiresAppSettings ?? false;
    this.source = source;
  }
}

const pickerOptions = {
  allowsEditing: true,
  aspect: [1, 1],
  mediaTypes: ['images'],
  quality: 0.85,
} as const satisfies ImagePickerOptions;

const requestPermission = (
  picker: ProfilePhotoPicker,
  source: ProfilePhotoSource,
): Promise<CameraPermissionResponse | MediaLibraryPermissionResponse> =>
  source === 'camera'
    ? picker.requestCameraPermissionsAsync()
    : picker.requestMediaLibraryPermissionsAsync();

const openPicker = (
  picker: ProfilePhotoPicker,
  source: ProfilePhotoSource,
): Promise<ImagePickerResult> =>
  source === 'camera'
    ? picker.launchCameraAsync(pickerOptions)
    : picker.launchImageLibraryAsync({ ...pickerOptions, selectionLimit: 1 });

export const selectProfilePhoto = async (
  picker: ProfilePhotoPicker,
  source: ProfilePhotoSource,
): Promise<ImagePickerAsset | null> => {
  let permission: CameraPermissionResponse | MediaLibraryPermissionResponse;
  try {
    permission = await requestPermission(picker, source);
  } catch {
    throw new ProfilePhotoSelectionError(
      source === 'camera'
        ? 'Camera permission could not be checked. Try again.'
        : 'Photo library permission could not be checked. Try again.',
      source,
    );
  }

  if (!permission.granted) {
    const label = source === 'camera' ? 'Camera' : 'Photo library';
    throw new ProfilePhotoSelectionError(
      permission.canAskAgain
        ? `${label} access is needed to ${source === 'camera' ? 'take' : 'choose'} a profile photo.`
        : `Enable ${label.toLocaleLowerCase()} access for JagrukSetu in device settings.`,
      source,
      { requiresAppSettings: !permission.canAskAgain },
    );
  }

  let result: ImagePickerResult;
  try {
    result = await openPicker(picker, source);
  } catch {
    throw new ProfilePhotoSelectionError(
      source === 'camera'
        ? 'The camera could not be opened. Try again.'
        : 'The photo library could not be opened. Try again.',
      source,
    );
  }

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) {
    throw new ProfilePhotoSelectionError(
      source === 'camera'
        ? 'The captured image is unavailable. Take another photo.'
        : 'The selected image is unavailable. Choose another photo.',
      source,
    );
  }

  return asset;
};
