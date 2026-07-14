import { Global, Module } from '@nestjs/common';

import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { ComplaintMediaGateway } from '../data/complaint-media.gateway.js';
import { ComplaintStore } from '../data/complaint.store.js';
import { IdentityStore } from '../data/identity.store.js';
import { RoutingStore } from '../data/routing.store.js';
import { SupabaseAuthenticationGateway } from './supabase-authentication.gateway.js';
import { SupabaseComplaintMediaGateway } from './supabase-complaint-media.gateway.js';
import { SupabaseComplaintStore } from './supabase-complaint.store.js';
import { SupabaseClients } from './supabase-clients.js';
import { SupabaseIdentityStore } from './supabase-identity.store.js';
import { SupabaseRoutingStore } from './supabase-routing.store.js';

@Global()
@Module({
  providers: [
    SupabaseClients,
    SupabaseAuthenticationGateway,
    SupabaseComplaintMediaGateway,
    SupabaseComplaintStore,
    SupabaseIdentityStore,
    SupabaseRoutingStore,
    {
      provide: AuthenticationGateway,
      useExisting: SupabaseAuthenticationGateway,
    },
    {
      provide: IdentityStore,
      useExisting: SupabaseIdentityStore,
    },
    {
      provide: RoutingStore,
      useExisting: SupabaseRoutingStore,
    },
    {
      provide: ComplaintStore,
      useExisting: SupabaseComplaintStore,
    },
    {
      provide: ComplaintMediaGateway,
      useExisting: SupabaseComplaintMediaGateway,
    },
  ],
  exports: [
    AuthenticationGateway,
    ComplaintMediaGateway,
    ComplaintStore,
    IdentityStore,
    RoutingStore,
  ],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SupabaseModule {}
