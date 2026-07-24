import type { MessageKey } from '@local-wellness/localization';
import type {
  ComplaintStatus,
  PublicComplaintStatus,
  RoutingDecisionStatus,
} from '@local-wellness/types';

export const complaintStatusMessageKeys = {
  acknowledged: 'statusAcknowledged',
  assigned: 'statusAssigned',
  cancelled: 'statusCancelled',
  citizen_verification_pending: 'statusCitizenVerificationPending',
  closed: 'statusClosed',
  escalated: 'statusEscalated',
  inspection_completed: 'statusInspectionCompleted',
  inspection_scheduled: 'statusInspectionScheduled',
  rejected: 'statusRejected',
  reopened: 'statusReopened',
  resolution_submitted: 'statusResolutionSubmitted',
  resolved: 'statusResolved',
  routing_pending: 'statusRoutingPending',
  submitted: 'statusSubmitted',
  transferred: 'statusTransferred',
  validated: 'statusValidated',
  validation_pending: 'statusValidationPending',
  waiting_for_external_agency: 'statusWaitingExternalAgency',
  waiting_for_material: 'statusWaitingMaterial',
  work_in_progress: 'statusWorkInProgress',
  work_order_created: 'statusWorkOrderCreated',
} as const satisfies Record<ComplaintStatus, MessageKey>;

export const publicComplaintStatusMessageKeys = {
  closed: 'statusClosed',
  in_progress: 'statusInProgress',
  reported: 'statusReported',
  resolved: 'statusResolved',
} as const satisfies Record<PublicComplaintStatus, MessageKey>;

export const routingDecisionStatusMessageKeys = {
  manual_review: 'routingStatusManualReview',
  mapping_required: 'routingStatusMappingRequired',
  routed: 'routingStatusRouted',
  unsupported_area: 'routingStatusUnsupportedArea',
} as const satisfies Record<RoutingDecisionStatus, MessageKey>;
