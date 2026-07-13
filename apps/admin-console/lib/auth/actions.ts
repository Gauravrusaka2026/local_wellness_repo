'use server';

import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '../supabase/server';
import { signOutAdminSession } from './service';

export const signOutAction = async (): Promise<never> => {
  const supabase = await createServerSupabaseClient();
  await signOutAdminSession(supabase);

  redirect('/auth/login');
};
