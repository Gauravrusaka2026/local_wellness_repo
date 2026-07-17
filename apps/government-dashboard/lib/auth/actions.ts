'use server';

import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '../supabase/server';
import { signOutGovernmentSession } from './service';

const signOutAndRedirect = async (destination: string): Promise<never> => {
  const supabase = await createServerSupabaseClient();
  await signOutGovernmentSession(supabase);

  redirect(destination);
};

export const signOutAction = async (): Promise<never> =>
  signOutAndRedirect('/auth/login?status=signed-out');

export const switchGovernmentAccountAction = async (): Promise<never> =>
  signOutAndRedirect('/auth/login?status=switch-account');
