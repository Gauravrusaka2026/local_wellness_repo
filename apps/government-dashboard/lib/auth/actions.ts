'use server';

import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '../supabase/server';
import { signOutGovernmentSession } from './service';

export const signOutAction = async (): Promise<never> => {
  const supabase = await createServerSupabaseClient();
  await signOutGovernmentSession(supabase);

  redirect('/auth/login');
};
