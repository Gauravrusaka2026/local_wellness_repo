'use server';

import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '../supabase/server';
import { signOutCitizenSession } from './service';

export const signOutAction = async (): Promise<never> => {
  const supabase = await createServerSupabaseClient();
  await signOutCitizenSession(supabase);

  redirect('/auth/login');
};
