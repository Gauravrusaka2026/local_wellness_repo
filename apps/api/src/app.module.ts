import { Module } from '@nestjs/common';

import { AccountabilityModule } from './accountability/accountability.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CommonModule } from './common/common.module.js';
import { ComplaintsModule } from './complaints/complaints.module.js';
import { CitizenResolutionModule } from './complaints/citizen-resolution.module.js';
import { CommunicationsModule } from './communications/communications.module.js';
import { ConfigurationModule } from './configuration.module.js';
import { RateLimitInterceptor } from './common/rate-limit.js';
import { IdentityModule } from './identity/identity.module.js';
import { GovernmentComplaintsModule } from './government-complaints/government-complaints.module.js';
import { GovernanceDirectoryModule } from './governance-directory/governance-directory.module.js';
import { HealthModule } from './health/health.module.js';
import { RoutingModule } from './routing/routing.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { TransparencyModule } from './transparency/transparency.module.js';

@Module({
  imports: [
    ConfigurationModule,
    AccountabilityModule,
    CommonModule,
    SupabaseModule,
    AuthModule,
    IdentityModule,
    AdminModule,
    RoutingModule,
    ComplaintsModule,
    CitizenResolutionModule,
    CommunicationsModule,
    GovernmentComplaintsModule,
    GovernanceDirectoryModule,
    HealthModule,
    TransparencyModule,
  ],
  providers: [RateLimitInterceptor],
})
// Nest uses the decorated class itself as the application module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
