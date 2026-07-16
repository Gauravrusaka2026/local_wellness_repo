import { Module } from '@nestjs/common';

import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CommonModule } from './common/common.module.js';
import { ComplaintsModule } from './complaints/complaints.module.js';
import { CitizenResolutionModule } from './complaints/citizen-resolution.module.js';
import { CommunicationsModule } from './communications/communications.module.js';
import { ConfigurationModule } from './configuration.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { GovernmentComplaintsModule } from './government-complaints/government-complaints.module.js';
import { RoutingModule } from './routing/routing.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';

@Module({
  imports: [
    ConfigurationModule,
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
  ],
})
// Nest uses the decorated class itself as the application module token.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
