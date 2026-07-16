import { Global, Module } from '@nestjs/common';

import { AuthenticationGateway } from '../auth/authentication.gateway.js';
import { AccountabilityStore } from '../data/accountability.store.js';
import { ComplaintMediaGateway } from '../data/complaint-media.gateway.js';
import { CitizenResolutionStore } from '../data/citizen-resolution.store.js';
import { ComplaintStore } from '../data/complaint.store.js';
import { CommunicationStore } from '../data/communication.store.js';
import { IdentityStore } from '../data/identity.store.js';
import { GovernmentComplaintStore } from '../data/government-complaint.store.js';
import { GovernanceDirectoryStore } from '../data/governance-directory.store.js';
import { HealthStore } from '../data/health.store.js';
import { RateLimitStore } from '../data/rate-limit.store.js';
import { ResolutionEvidenceGateway } from '../data/resolution-evidence.gateway.js';
import { RoutingStore } from '../data/routing.store.js';
import { TransparencyStore } from '../data/transparency.store.js';
import { SupabaseAuthenticationGateway } from './supabase-authentication.gateway.js';
import { SupabaseAccountabilityStore } from './supabase-accountability.store.js';
import { SupabaseComplaintMediaGateway } from './supabase-complaint-media.gateway.js';
import { SupabaseCitizenResolutionStore } from './supabase-citizen-resolution.store.js';
import { SupabaseComplaintStore } from './supabase-complaint.store.js';
import { SupabaseCommunicationStore } from './supabase-communication.store.js';
import { SupabaseClients } from './supabase-clients.js';
import { SupabaseIdentityStore } from './supabase-identity.store.js';
import { SupabaseGovernanceDirectoryStore } from './supabase-governance-directory.store.js';
import { SupabaseRoutingStore } from './supabase-routing.store.js';
import { SupabaseTransparencyStore } from './supabase-transparency.store.js';
import { SupabaseGovernmentComplaintStore } from './supabase-government-complaint.store.js';
import { SupabaseHealthStore } from './supabase-health.store.js';
import { SupabaseRateLimitStore } from './supabase-rate-limit.store.js';
import { SupabaseResolutionEvidenceGateway } from './supabase-resolution-evidence.gateway.js';

@Global()
@Module({
  providers: [
    SupabaseClients,
    SupabaseAccountabilityStore,
    SupabaseAuthenticationGateway,
    SupabaseComplaintMediaGateway,
    SupabaseCitizenResolutionStore,
    SupabaseComplaintStore,
    SupabaseCommunicationStore,
    SupabaseIdentityStore,
    SupabaseGovernanceDirectoryStore,
    SupabaseRoutingStore,
    SupabaseTransparencyStore,
    SupabaseGovernmentComplaintStore,
    SupabaseHealthStore,
    SupabaseRateLimitStore,
    SupabaseResolutionEvidenceGateway,
    {
      provide: AccountabilityStore,
      useExisting: SupabaseAccountabilityStore,
    },
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
      provide: GovernanceDirectoryStore,
      useExisting: SupabaseGovernanceDirectoryStore,
    },
    {
      provide: ComplaintStore,
      useExisting: SupabaseComplaintStore,
    },
    {
      provide: CitizenResolutionStore,
      useExisting: SupabaseCitizenResolutionStore,
    },
    {
      provide: CommunicationStore,
      useExisting: SupabaseCommunicationStore,
    },
    {
      provide: ComplaintMediaGateway,
      useExisting: SupabaseComplaintMediaGateway,
    },
    {
      provide: GovernmentComplaintStore,
      useExisting: SupabaseGovernmentComplaintStore,
    },
    {
      provide: ResolutionEvidenceGateway,
      useExisting: SupabaseResolutionEvidenceGateway,
    },
    {
      provide: HealthStore,
      useExisting: SupabaseHealthStore,
    },
    {
      provide: RateLimitStore,
      useExisting: SupabaseRateLimitStore,
    },
    {
      provide: TransparencyStore,
      useExisting: SupabaseTransparencyStore,
    },
  ],
  exports: [
    AccountabilityStore,
    AuthenticationGateway,
    ComplaintMediaGateway,
    ComplaintStore,
    CitizenResolutionStore,
    CommunicationStore,
    IdentityStore,
    GovernanceDirectoryStore,
    RoutingStore,
    GovernmentComplaintStore,
    HealthStore,
    RateLimitStore,
    ResolutionEvidenceGateway,
    TransparencyStore,
  ],
})
// Nest uses the decorated class itself as the module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SupabaseModule {}
