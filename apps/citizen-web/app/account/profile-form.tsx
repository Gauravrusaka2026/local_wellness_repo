'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { preferredLanguages, type PreferredLanguage, type Profile } from '../../lib/api/profile';
import { updateProfileAction, type ProfileActionState } from './actions';

const languageLabels: Readonly<Record<PreferredLanguage, string>> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
};

const SaveButton = () => {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button" disabled={pending} type="submit">
      {pending ? 'Saving…' : 'Save profile'}
    </button>
  );
};

export const ProfileForm = ({ profile }: Readonly<{ profile: Profile }>) => {
  const initialState: ProfileActionState = {
    message: null,
    profile,
    status: 'idle',
  };
  const [state, formAction] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="stack profile-form">
      <div className="field-group">
        <label htmlFor="displayName">Name</label>
        <input
          autoComplete="name"
          defaultValue={profile.displayName ?? ''}
          id="displayName"
          maxLength={100}
          minLength={2}
          name="displayName"
          required
        />
        <p className="field-hint">Your name remains private account information.</p>
      </div>

      <fieldset className="language-picker">
        <legend>Preferred language</legend>
        {preferredLanguages.map((language) => (
          <label className="language-choice" key={language}>
            <input
              defaultChecked={profile.preferredLanguage === language}
              name="preferredLanguage"
              type="radio"
              value={language}
            />
            {languageLabels[language]}
          </label>
        ))}
      </fieldset>

      <SaveButton />
      {state.message === null ? null : (
        <p
          aria-live={state.status === 'error' ? 'assertive' : 'polite'}
          className={state.status === 'error' ? 'error-notice' : 'success-notice'}
          role={state.status === 'error' ? 'alert' : 'status'}
        >
          {state.message}
        </p>
      )}
    </form>
  );
};
