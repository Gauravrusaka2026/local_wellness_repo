import { Global, Module } from '@nestjs/common';

import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { IdentityStore } from '../data/identity.store.js';
import { SupabaseAuthenticationGateway } from './supabase-authentication.gateway.js';
import { SupabaseClients } from './supabase-clients.js';
import { SupabaseIdentityStore } from './supabase-identity.store.js';

@Global()
@Module({
  providers: [
    SupabaseClients,
    SupabaseAuthenticationGateway,
    SupabaseIdentityStore,
    {
      provide: AuthenticationGateway,
      useExisting: SupabaseAuthenticationGateway,
    },
    {
      provide: IdentityStore,
      useExisting: SupabaseIdentityStore,
    },
  ],
  exports: [AuthenticationGateway, IdentityStore],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SupabaseModule {}
