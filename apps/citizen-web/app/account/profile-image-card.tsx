'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import type { Profile } from '../../lib/api/profile';
import {
  createProfileImageSignedUrl,
  getProfileImageError,
  removePrivateProfileImage,
  uploadPrivateProfileImage,
  validateProfileImage,
} from '../../lib/profile-image';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';

const getProfileInitial = (profile: Profile): string => {
  const label = profile.displayName ?? profile.email ?? 'Citizen';
  return label.trim().charAt(0).toLocaleUpperCase() || 'C';
};

export const ProfileImageCard = ({ profile }: Readonly<{ profile: Profile }>) => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarLoadError, setAvatarLoadError] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const objectPath = currentProfile.avatarObjectPath;

    if (!objectPath) {
      return undefined;
    }

    const loadSignedUrl = async (): Promise<void> => {
      try {
        const url = await createProfileImageSignedUrl(supabase, currentProfile.id, objectPath);
        if (active) {
          setSignedUrl(url);
          setAvatarLoadError(null);
        }
      } catch (loadError) {
        if (active) {
          setSignedUrl(null);
          setAvatarLoadError(getProfileImageError(loadError));
        }
      }
    };

    void loadSignedUrl();
    return () => {
      active = false;
    };
  }, [
    currentProfile.avatarObjectPath,
    currentProfile.avatarUpdatedAt,
    currentProfile.id,
    supabase,
  ]);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setSuccess(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    try {
      validateProfileImage(file);
      setSelectedFile(file);
    } catch (selectionError) {
      setSelectedFile(null);
      event.target.value = '';
      setError(getProfileImageError(selectionError));
    }
  };

  const upload = async (): Promise<void> => {
    if (!selectedFile) {
      setError('Choose a JPEG, PNG, or WebP image first.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsPending(true);
    try {
      const result = await uploadPrivateProfileImage(supabase, currentProfile, selectedFile);
      setSignedUrl(null);
      setAvatarLoadError(null);
      setCurrentProfile(result.profile);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setSuccess(
        result.previousObjectCleanupFailed
          ? 'Your photo was saved. An older private image is awaiting cleanup.'
          : 'Your private profile photo was saved.',
      );
    } catch (uploadError) {
      setError(getProfileImageError(uploadError));
    } finally {
      setIsPending(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!currentProfile.avatarObjectPath) return;
    if (!window.confirm('Remove your current private profile photo?')) return;

    setError(null);
    setSuccess(null);
    setIsPending(true);
    try {
      const updatedProfile = await removePrivateProfileImage(supabase, currentProfile);
      setSignedUrl(null);
      setAvatarLoadError(null);
      setCurrentProfile(updatedProfile);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setSuccess('Your private profile photo was removed.');
    } catch (removalError) {
      setError(getProfileImageError(removalError));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section aria-labelledby="profile-photo-heading" className="content-card profile-image-card">
      <div className="profile-image-heading">
        <div>
          <h2 id="profile-photo-heading">Profile photo</h2>
          <p className="field-hint">
            Your photo is private. Only your signed-in account receives a short-lived viewing link.
          </p>
        </div>
        <div aria-label="Current profile photo" className="profile-image-preview">
          {signedUrl ? (
            <Image
              alt="Citizen profile photo"
              height={112}
              onError={() => {
                setSignedUrl(null);
                setAvatarLoadError('The profile photo is temporarily unavailable.');
              }}
              priority
              src={signedUrl}
              unoptimized
              width={112}
            />
          ) : (
            <span aria-hidden="true">{getProfileInitial(currentProfile)}</span>
          )}
        </div>
      </div>

      <div aria-busy={isPending} className="stack">
        <label htmlFor="profile-photo">Choose a photo</label>
        <input
          accept="image/jpeg,image/png,image/webp"
          disabled={isPending}
          id="profile-photo"
          onChange={chooseFile}
          ref={fileInput}
          type="file"
        />
        <p className="field-hint">JPEG, PNG, or WebP. Maximum size: 5 MiB.</p>
        {selectedFile ? <p className="selected-file">Selected: {selectedFile.name}</p> : null}
        <div className="button-row profile-image-actions">
          <button
            className="primary-button"
            disabled={isPending || !selectedFile}
            onClick={() => void upload()}
            type="button"
          >
            {isPending
              ? 'Updating…'
              : currentProfile.avatarObjectPath
                ? 'Replace photo'
                : 'Upload photo'}
          </button>
          {currentProfile.avatarObjectPath ? (
            <button
              className="secondary-button"
              disabled={isPending}
              onClick={() => void remove()}
              type="button"
            >
              Remove photo
            </button>
          ) : null}
        </div>
      </div>

      {avatarLoadError ? (
        <p aria-live="polite" className="field-hint" role="status">
          {avatarLoadError}
        </p>
      ) : null}
      {error ? (
        <p aria-live="assertive" className="error-notice" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p aria-live="polite" className="success-notice" role="status">
          {success}
        </p>
      ) : null}
    </section>
  );
};
