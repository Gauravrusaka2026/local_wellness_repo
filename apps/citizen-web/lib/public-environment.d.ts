declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_CITIZEN_ACCESS_MODE?: 'full' | 'public-only';
    readonly NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE?: 'enforce' | 'observe';
    /** @deprecated Use NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE. */
    readonly NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE?: 'enforce' | 'observe';
    readonly NEXT_PUBLIC_API_URL?: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  }
}
