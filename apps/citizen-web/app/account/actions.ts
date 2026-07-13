'use server';

import { getUserFacingApiError, getVerifiedAccessToken } from '../../lib/api/client';
import {
  preferredLanguages,
  saveProfile,
  type PreferredLanguage,
  type Profile,
} from '../../lib/api/profile';
import { createServerSupabaseClient } from '../../lib/supabase/server';

export type ProfileActionState = Readonly<{
  message: string | null;
  profile: Profile | null;
  status: 'error' | 'idle' | 'success';
}>;

const parseLanguage = (value: FormDataEntryValue | null): PreferredLanguage | null =>
  typeof value === 'string' && preferredLanguages.includes(value as PreferredLanguage)
    ? (value as PreferredLanguage)
    : null;

export const updateProfileAction = async (
  previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> => {
  void previousState;
  const displayNameValue = formData.get('displayName');
  const displayName = typeof displayNameValue === 'string' ? displayNameValue.trim() : '';
  const preferredLanguage = parseLanguage(formData.get('preferredLanguage'));

  if (displayName.length < 2 || displayName.length > 100) {
    return {
      message: 'Your name must be between 2 and 100 characters.',
      profile: null,
      status: 'error',
    };
  }

  if (preferredLanguage === null) {
    return { message: 'Choose a supported language.', profile: null, status: 'error' };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const accessToken = await getVerifiedAccessToken(supabase);
    const profile = await saveProfile(accessToken, { displayName, preferredLanguage });

    return {
      message: 'Your profile and language preference have been saved.',
      profile,
      status: 'success',
    };
  } catch (error) {
    return { message: getUserFacingApiError(error), profile: null, status: 'error' };
  }
};
