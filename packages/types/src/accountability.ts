export const slaMilestones = ['acknowledgement', 'inspection', 'resolution'] as const;
export type SlaMilestone = (typeof slaMilestones)[number];

export const complaintSlaClockStates = [
  'active',
  'paused',
  'met',
  'breached',
  'cancelled',
] as const;
export type ComplaintSlaClockState = (typeof complaintSlaClockStates)[number];

export interface GovernmentComplaintSlaClock {
  id: string;
  milestone: SlaMilestone;
  cycle: number;
  state: ComplaintSlaClockState;
  policyCode: string;
  policyVersion: number;
  targetBusinessMinutes: number;
  startedAt: string;
  targetAt: string;
  completedAt: string | null;
  breachedAt: string | null;
  pausedAt: string | null;
  externalDependencySegment: boolean;
}

export interface GovernmentComplaintSlaEscalation {
  id: string;
  clockId: string;
  milestone: SlaMilestone;
  level: number;
  action: 'record' | 'mark_escalated';
  occurredAt: string;
  resultingStatus: string;
}

export interface GovernmentComplaintSlaSummary {
  complaintId: string;
  policyApplied: boolean;
  unavailableReason:
    'no_approved_policy' | 'ambiguous_policy' | 'invalid_configuration' | 'not_materialized' | null;
  clocks: GovernmentComplaintSlaClock[];
  escalations: GovernmentComplaintSlaEscalation[];
}

export const governmentKpiMetricCodes = [
  'acknowledgement_compliance',
  'resolution_compliance',
  'citizen_confirmed_resolution_rate',
  'reopen_rate',
  'misrouting_rate',
  'backlog',
  'evidence_completeness',
  'communication_quality',
] as const;
export type GovernmentKpiMetricCode = (typeof governmentKpiMetricCodes)[number];

export const governmentKpiScopeTypes = ['municipality', 'ward', 'department'] as const;
export type GovernmentKpiScopeType = (typeof governmentKpiScopeTypes)[number];

export const governmentKpiSegments = [
  'all',
  'external_dependency',
  'no_external_dependency',
] as const;
export type GovernmentKpiSegment = (typeof governmentKpiSegments)[number];

export interface GovernmentKpiQuery {
  authorityId?: string | undefined;
  scopeRoleAssignmentId?: string | undefined;
  scopeType?: GovernmentKpiScopeType | undefined;
  scopeId?: string | undefined;
  segment?: GovernmentKpiSegment | undefined;
  metricCodes?: GovernmentKpiMetricCode[] | undefined;
}

export interface GovernmentComplaintSlaQuery {
  scopeRoleAssignmentId?: string | undefined;
}

export interface GovernmentKpiSnapshot {
  id: string;
  metricCode: GovernmentKpiMetricCode;
  metricName: string;
  unit: 'count' | 'percent';
  definitionVersion: number;
  scopeType: GovernmentKpiScopeType;
  scopeId: string;
  scopeName: string;
  segment: GovernmentKpiSegment;
  numerator: number;
  denominator: number;
  value: number | null;
  sampleSize: number;
}

export interface GovernmentKpiSnapshotResult {
  runId: string | null;
  windowStartedAt: string | null;
  windowEndedAt: string | null;
  sourceCutoffAt: string | null;
  calculatedAt: string | null;
  items: GovernmentKpiSnapshot[];
}
