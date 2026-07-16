import { complaintIdempotencyKeyPattern } from '@local-wellness/types';
import {
  acknowledgeGovernmentComplaintSchema,
  addGovernmentComplaintExternalDependencySchema,
  addGovernmentComplaintInternalNoteSchema,
  addGovernmentComplaintWorkReferenceSchema,
  assignGovernmentComplaintSchema,
  completeGovernmentComplaintInspectionSchema,
  governmentComplaintIdParametersSchema,
  governmentExternalDependencyIdParametersSchema,
  governmentInspectionIdParametersSchema,
  resolveGovernmentComplaintExternalDependencySchema,
  scheduleGovernmentComplaintInspectionSchema,
  submitGovernmentComplaintResolutionSchema,
  transferGovernmentComplaintSchema,
  updateGovernmentComplaintStatusSchema,
} from '@local-wellness/validation';

export const dashboardActionNames = [
  'acknowledge',
  'assign',
  'transfer',
  'update_status',
  'add_internal_note',
  'schedule_inspection',
  'complete_inspection',
  'add_work_reference',
  'add_external_dependency',
  'resolve_external_dependency',
  'submit_resolution',
] as const;

export type DashboardActionName = (typeof dashboardActionNames)[number];

export type ParsedGovernmentAction = Readonly<{
  action: DashboardActionName;
  body: unknown;
  complaintId: string;
  dependencyId?: string;
  idempotencyKey: string;
  inspectionId?: string;
}>;

export class GovernmentActionInputError extends Error {
  public constructor(message = 'Review the highlighted action fields and try again.') {
    super(message);
    this.name = 'GovernmentActionInputError';
  }
}

const text = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
};

const optionalText = (formData: FormData, name: string): string | undefined => {
  const value = text(formData, name);
  return value === '' ? undefined : value;
};

const integer = (formData: FormData, name: string): number => Number(text(formData, name));

const indiaOffsetTimestamp = (value: string, endOfDay = false): string | undefined => {
  if (value === '') return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}+05:30`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(value)) return `${value}:00+05:30`;
  return value;
};

const parseActionName = (value: string): DashboardActionName => {
  if (!dashboardActionNames.includes(value as DashboardActionName)) {
    throw new GovernmentActionInputError('The requested complaint action is invalid.');
  }
  return value as DashboardActionName;
};

const parseCommon = (formData: FormData) => {
  const complaintId = text(formData, 'complaintId');
  const idempotencyKey = text(formData, 'idempotencyKey');
  const expectedWorkflowVersion = integer(formData, 'expectedWorkflowVersion');
  const idResult = governmentComplaintIdParametersSchema.safeParse({ complaintId });

  if (!idResult.success || !complaintIdempotencyKeyPattern.test(idempotencyKey)) {
    throw new GovernmentActionInputError(
      'The complaint action form is no longer valid. Reload it.',
    );
  }

  return { complaintId, expectedWorkflowVersion, idempotencyKey };
};

const parseWithSchema = <Output>(
  schema: Readonly<{ safeParse: (value: unknown) => { success: boolean; data?: Output } }>,
  value: unknown,
): Output => {
  const result = schema.safeParse(value);
  if (!result.success || result.data === undefined) throw new GovernmentActionInputError();
  return result.data;
};

export const parseGovernmentActionForm = (formData: FormData): ParsedGovernmentAction => {
  const action = parseActionName(text(formData, 'action'));
  const common = parseCommon(formData);
  let body: unknown;
  let dependencyId: string | undefined;
  let inspectionId: string | undefined;

  switch (action) {
    case 'acknowledge':
      body = parseWithSchema(acknowledgeGovernmentComplaintSchema, {
        expectedWorkflowVersion: common.expectedWorkflowVersion,
        publicMessage: optionalText(formData, 'publicMessage'),
      });
      break;
    case 'assign':
      body = parseWithSchema(assignGovernmentComplaintSchema, {
        expectedWorkflowVersion: common.expectedWorkflowVersion,
        note: optionalText(formData, 'note'),
        officerAssignmentId: text(formData, 'officerAssignmentId'),
        reason: text(formData, 'reason'),
      });
      break;
    case 'transfer':
      body = parseWithSchema(transferGovernmentComplaintSchema, {
        expectedWorkflowVersion: common.expectedWorkflowVersion,
        note: optionalText(formData, 'note'),
        officerAssignmentId: text(formData, 'officerAssignmentId'),
        reason: text(formData, 'reason'),
      });
      break;
    case 'update_status':
      body = parseWithSchema(updateGovernmentComplaintStatusSchema, {
        expectedWorkflowVersion: common.expectedWorkflowVersion,
        publicMessage: optionalText(formData, 'publicMessage'),
        status: text(formData, 'status'),
      });
      break;
    case 'add_internal_note':
      body = parseWithSchema(addGovernmentComplaintInternalNoteSchema, {
        body: text(formData, 'body'),
        expectedWorkflowVersion: common.expectedWorkflowVersion,
      });
      break;
    case 'schedule_inspection':
      body = parseWithSchema(scheduleGovernmentComplaintInspectionSchema, {
        expectedWorkflowVersion: common.expectedWorkflowVersion,
        instructions: optionalText(formData, 'instructions'),
        scheduledFor: indiaOffsetTimestamp(text(formData, 'scheduledFor')),
      });
      break;
    case 'complete_inspection': {
      inspectionId = text(formData, 'inspectionId');
      if (
        !governmentInspectionIdParametersSchema.safeParse({
          complaintId: common.complaintId,
          inspectionId,
        }).success
      ) {
        throw new GovernmentActionInputError('Choose a scheduled inspection to complete.');
      }
      body = parseWithSchema(completeGovernmentComplaintInspectionSchema, {
        expectedWorkflowVersion: common.expectedWorkflowVersion,
        outcome: text(formData, 'outcome'),
        summary: text(formData, 'summary'),
      });
      break;
    }
    case 'add_work_reference':
      body = parseWithSchema(addGovernmentComplaintWorkReferenceSchema, {
        description: optionalText(formData, 'description'),
        expectedWorkflowVersion: common.expectedWorkflowVersion,
        referenceNumber: text(formData, 'referenceNumber'),
        referenceType: text(formData, 'referenceType'),
      });
      break;
    case 'add_external_dependency':
      body = parseWithSchema(addGovernmentComplaintExternalDependencySchema, {
        dependencyType: text(formData, 'dependencyType'),
        description: text(formData, 'description'),
        expectedBy: indiaOffsetTimestamp(text(formData, 'expectedBy'), true),
        expectedWorkflowVersion: common.expectedWorkflowVersion,
      });
      break;
    case 'resolve_external_dependency': {
      dependencyId = text(formData, 'dependencyId');
      if (
        !governmentExternalDependencyIdParametersSchema.safeParse({
          complaintId: common.complaintId,
          dependencyId,
        }).success
      ) {
        throw new GovernmentActionInputError('Choose an active external dependency to resolve.');
      }
      body = parseWithSchema(resolveGovernmentComplaintExternalDependencySchema, {
        expectedWorkflowVersion: common.expectedWorkflowVersion,
        resolutionSummary: optionalText(formData, 'resolutionSummary'),
      });
      break;
    }
    case 'submit_resolution':
      body = parseWithSchema(submitGovernmentComplaintResolutionSchema, {
        completionNote: text(formData, 'completionNote'),
        completionLocation: {
          accuracyMeters: Number(text(formData, 'completionAccuracyMeters')),
          capturedAt: text(formData, 'completionCapturedAt'),
          deviceRecordedAt: text(formData, 'completionDeviceRecordedAt'),
          isMockLocation: null,
          latitude: Number(text(formData, 'completionLatitude')),
          longitude: Number(text(formData, 'completionLongitude')),
          provider: text(formData, 'completionProvider'),
        },
        expectedWorkflowVersion: common.expectedWorkflowVersion,
        publicMessage: optionalText(formData, 'publicMessage'),
        resolutionEvidenceIds: formData
          .getAll('resolutionEvidenceIds')
          .filter((value): value is string => typeof value === 'string'),
        workReferenceId: optionalText(formData, 'workReferenceId'),
      });
      break;
  }

  return {
    action,
    body,
    complaintId: common.complaintId,
    ...(dependencyId === undefined ? {} : { dependencyId }),
    idempotencyKey: common.idempotencyKey,
    ...(inspectionId === undefined ? {} : { inspectionId }),
  };
};
