'use client';

import React, { useActionState, useState, type FormEvent, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import {
  governmentComplaintAssignmentReasons,
  governmentComplaintTransferReasons,
  governmentExternalDependencyTypes,
  governmentInspectionOutcomes,
  type ComplaintStatus,
  type GovernmentComplaintAllowedAction,
  type GovernmentComplaintAssignmentOption,
  type GovernmentComplaintExternalDependency,
  type GovernmentComplaintInspection,
  type GovernmentComplaintWorkReference,
  type GovernmentResolutionEvidence,
  type ComplaintLocationCapture,
} from '@local-wellness/types';

import { createBrowserSupabaseClient } from '../../../lib/supabase/client';
import {
  getAssignmentReasonLabel,
  getDependencyTypeLabel,
  getInspectionOutcomeLabel,
  getStatusLabel,
  getTransferReasonLabel,
} from '../../../lib/complaints/presentation';
import {
  finalizeResolutionEvidenceUpload,
  initialGovernmentActionState,
  performGovernmentComplaintAction,
  requestResolutionEvidenceUpload,
} from './actions';

type ActionKey = Exclude<GovernmentComplaintAllowedAction, 'upload_resolution_evidence'>;

type ActionKeys = Readonly<Record<GovernmentComplaintAllowedAction, string>>;

type GovernmentActionFormsProperties = Readonly<{
  allowedActions: GovernmentComplaintAllowedAction[];
  allowedStatusTransitions: ComplaintStatus[];
  assignmentOptions: GovernmentComplaintAssignmentOption[];
  complaintId: string;
  evidence: GovernmentResolutionEvidence[];
  externalDependencies: GovernmentComplaintExternalDependency[];
  inspections: GovernmentComplaintInspection[];
  operationKeys: ActionKeys;
  workReferences: GovernmentComplaintWorkReference[];
  workflowVersion: number;
}>;

type BrowserGeolocationPosition = Readonly<{
  coords: Readonly<{
    accuracy: number;
    latitude: number;
    longitude: number;
  }>;
  timestamp: number;
}>;

export const toCompletionLocation = (
  position: BrowserGeolocationPosition,
  deviceRecordedAt = new Date().toISOString(),
): ComplaintLocationCapture => ({
  accuracyMeters: position.coords.accuracy,
  capturedAt: new Date(position.timestamp).toISOString(),
  deviceRecordedAt,
  isMockLocation: null,
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  provider: 'unknown',
});

export const getAvailableResolutionEvidence = (
  evidence: GovernmentResolutionEvidence[],
): GovernmentResolutionEvidence[] =>
  evidence.filter(
    ({ availableForResolution, uploadStatus }) =>
      availableForResolution && uploadStatus === 'finalized',
  );

const SubmitButton = ({
  label,
  pendingLabel,
}: Readonly<{ label: string; pendingLabel: string }>) => {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button" disabled={pending} type="submit">
      {pending ? pendingLabel : label}
    </button>
  );
};

const Feedback = ({
  message,
  status,
}: Readonly<{ message: string | null; status: 'conflict' | 'error' | 'idle' | 'success' }>) =>
  message === null ? null : (
    <p
      aria-live={status === 'error' || status === 'conflict' ? 'assertive' : 'polite'}
      className={status === 'success' ? 'success-notice' : 'error-notice'}
      role={status === 'success' ? 'status' : 'alert'}
    >
      {message}
    </p>
  );

const ActionForm = ({
  action,
  buttonLabel,
  children,
  complaintId,
  idempotencyKey,
  pendingLabel,
  workflowVersion,
}: Readonly<{
  action: ActionKey;
  buttonLabel: string;
  children?: ReactNode;
  complaintId: string;
  idempotencyKey: string;
  pendingLabel: string;
  workflowVersion: number;
}>) => {
  const [state, formAction] = useActionState(
    performGovernmentComplaintAction,
    initialGovernmentActionState,
  );

  return (
    <form action={formAction} className="action-form">
      <input name="action" type="hidden" value={action} />
      <input name="complaintId" type="hidden" value={complaintId} />
      <input name="expectedWorkflowVersion" type="hidden" value={workflowVersion} />
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      {children}
      <SubmitButton label={buttonLabel} pendingLabel={pendingLabel} />
      <Feedback message={state.message} status={state.status} />
    </form>
  );
};

const AssignmentOptionLabel = ({
  option,
}: Readonly<{ option: GovernmentComplaintAssignmentOption }>) => (
  <>
    {option.officerName} — {option.officerRoleName}, {option.departmentName}
    {option.wardName === null ? '' : ` (${option.wardName})`}
  </>
);

const EvidenceUploader = ({
  complaintId,
  workflowVersion,
}: Readonly<{ complaintId: string; workflowVersion: number }>) => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const upload = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (file === null) {
      setIsError(true);
      setMessage('Choose a photo or video first.');
      return;
    }

    setIsPending(true);
    setIsError(false);
    setMessage('Preparing the private upload…');
    try {
      const bytes = await file.arrayBuffer();
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      const sha256 = [...new Uint8Array(digest)]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
      const kind = file.type.startsWith('image/') ? 'photo' : 'video';
      const intentForm = new FormData();
      intentForm.set('complaintId', complaintId);
      intentForm.set('expectedWorkflowVersion', String(workflowVersion));
      intentForm.set('idempotencyKey', globalThis.crypto.randomUUID());
      intentForm.set('kind', kind);
      intentForm.set('mimeType', file.type);
      intentForm.set('byteSize', String(file.size));
      intentForm.set('sha256', sha256);
      const intentResult = await requestResolutionEvidenceUpload(intentForm);
      if (intentResult.status === 'error') throw new Error(intentResult.message);

      setMessage('Uploading encrypted evidence…');
      const { error } = await createBrowserSupabaseClient()
        .storage.from(intentResult.intent.upload.bucket)
        .uploadToSignedUrl(
          intentResult.intent.upload.objectPath,
          intentResult.intent.upload.token,
          bytes,
          { cacheControl: '0', contentType: file.type, upsert: false },
        );
      if (error) throw new Error('The private evidence upload failed. Reload and try again.');

      const finalizeForm = new FormData();
      finalizeForm.set('complaintId', complaintId);
      finalizeForm.set('evidenceId', intentResult.intent.evidence.id);
      finalizeForm.set('expectedWorkflowVersion', String(intentResult.intent.workflowVersion));
      finalizeForm.set('idempotencyKey', globalThis.crypto.randomUUID());
      finalizeForm.set('byteSize', String(file.size));
      finalizeForm.set('sha256', sha256);
      const finalized = await finalizeResolutionEvidenceUpload(finalizeForm);
      if (finalized.status !== 'success') throw new Error(finalized.message ?? 'Upload failed.');

      setFile(null);
      setMessage('The private resolution evidence is ready. Reloading the complaint…');
      globalThis.location.reload();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'The private upload could not finish.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form className="action-form" onSubmit={(event) => void upload(event)}>
      <div className="field-group">
        <label htmlFor="resolution-evidence-file">Resolution photo or video</label>
        <input
          accept="image/heic,image/heif,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          disabled={isPending}
          id="resolution-evidence-file"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setMessage(null);
          }}
          required
          type="file"
        />
        <p className="field-hint">Private, maximum 50 MB. Originals are never made public here.</p>
      </div>
      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? 'Uploading…' : 'Upload private evidence'}
      </button>
      {message === null ? null : (
        <p
          aria-live={isError ? 'assertive' : 'polite'}
          className={isError ? 'error-notice' : 'success-notice'}
          role={isError ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
    </form>
  );
};

const CompletionLocationFields = () => {
  const [location, setLocation] = useState<ComplaintLocationCapture | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const capture = (): void => {
    if (!globalThis.navigator.geolocation) {
      setMessage('This browser cannot capture a completion location. Use a supported device.');
      return;
    }

    setIsPending(true);
    setMessage('Capturing an accurate completion location…');
    globalThis.navigator.geolocation.getCurrentPosition(
      (position) => {
        const captured = toCompletionLocation(position);
        if (
          !Number.isFinite(captured.accuracyMeters) ||
          captured.accuracyMeters < 0 ||
          captured.accuracyMeters > 5_000
        ) {
          setLocation(null);
          setMessage('The browser did not return a usable accuracy estimate. Try again outdoors.');
        } else {
          setLocation(captured);
          setMessage(
            `Completion location captured to ${captured.accuracyMeters.toFixed(1)} metres.`,
          );
        }
        setIsPending(false);
      },
      (error) => {
        setLocation(null);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission is required to submit resolution evidence.'
            : 'The completion location could not be captured. Move outdoors and try again.',
        );
        setIsPending(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
  };

  return (
    <fieldset>
      <legend>Completion location</legend>
      <p className="field-hint">
        Capture the location where the work was completed. It remains restricted operational data.
      </p>
      <input
        aria-label="Completion latitude"
        name="completionLatitude"
        readOnly
        required
        type="text"
        value={location?.latitude ?? ''}
      />
      <input
        aria-label="Completion longitude"
        name="completionLongitude"
        readOnly
        required
        type="text"
        value={location?.longitude ?? ''}
      />
      <input
        aria-label="Completion location accuracy"
        name="completionAccuracyMeters"
        readOnly
        required
        type="text"
        value={location?.accuracyMeters ?? ''}
      />
      <input name="completionCapturedAt" type="hidden" value={location?.capturedAt ?? ''} />
      <input
        name="completionDeviceRecordedAt"
        type="hidden"
        value={location?.deviceRecordedAt ?? ''}
      />
      <input name="completionProvider" type="hidden" value={location?.provider ?? ''} />
      <button className="secondary-button" disabled={isPending} onClick={capture} type="button">
        {isPending
          ? 'Capturing location…'
          : location === null
            ? 'Capture location'
            : 'Recapture location'}
      </button>
      {message === null ? null : (
        <p aria-live="polite" className={location === null ? 'error-notice' : 'success-notice'}>
          {message}
        </p>
      )}
    </fieldset>
  );
};

export const GovernmentActionForms = ({
  allowedActions,
  allowedStatusTransitions,
  assignmentOptions,
  complaintId,
  evidence,
  externalDependencies,
  inspections,
  operationKeys,
  workReferences,
  workflowVersion,
}: GovernmentActionFormsProperties) => {
  const has = (action: GovernmentComplaintAllowedAction): boolean =>
    allowedActions.includes(action);
  const assignOptions = assignmentOptions.filter(({ allowedActions: actions }) =>
    actions.includes('assign'),
  );
  const transferOptions = assignmentOptions.filter(({ allowedActions: actions }) =>
    actions.includes('transfer'),
  );
  const scheduledInspections = inspections.filter(({ status }) => status === 'scheduled');
  const finalizedEvidence = getAvailableResolutionEvidence(evidence);
  const activeDependencies = externalDependencies.filter(({ status }) => status === 'active');

  if (allowedActions.length === 0) {
    return (
      <p className="empty-state">
        No actions are available for your current scope and this status.
      </p>
    );
  }

  return (
    <div className="action-list">
      {has('acknowledge') ? (
        <details open>
          <summary>Acknowledge complaint</summary>
          <ActionForm
            action="acknowledge"
            buttonLabel="Acknowledge"
            complaintId={complaintId}
            idempotencyKey={operationKeys.acknowledge}
            pendingLabel="Acknowledging…"
            workflowVersion={workflowVersion}
          >
            <div className="field-group">
              <label htmlFor="acknowledge-message">Public message (optional)</label>
              <textarea id="acknowledge-message" maxLength={1000} name="publicMessage" rows={3} />
            </div>
          </ActionForm>
        </details>
      ) : null}

      {has('assign') || has('transfer') ? (
        <details>
          <summary>{has('transfer') ? 'Assign or transfer' : 'Assign complaint'}</summary>
          {has('assign') ? (
            assignOptions.length === 0 ? (
              <p className="empty-state">No verified target is currently eligible to assign.</p>
            ) : (
              <ActionForm
                action="assign"
                buttonLabel="Update assignment"
                complaintId={complaintId}
                idempotencyKey={operationKeys.assign}
                pendingLabel="Assigning…"
                workflowVersion={workflowVersion}
              >
                <div className="field-group">
                  <label htmlFor="assign-target">Verified officer assignment</label>
                  <select id="assign-target" name="officerAssignmentId" required>
                    <option value="">Choose an assignment</option>
                    {assignOptions.map((option) => (
                      <option key={option.officerAssignmentId} value={option.officerAssignmentId}>
                        {option.officerName} — {option.officerRoleName}, {option.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="assign-reason">Reason</label>
                  <select id="assign-reason" name="reason" required>
                    {governmentComplaintAssignmentReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {getAssignmentReasonLabel(reason)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="assign-note">Private assignment note (optional)</label>
                  <textarea id="assign-note" maxLength={1000} name="note" rows={3} />
                </div>
              </ActionForm>
            )
          ) : null}
          {has('transfer') ? (
            transferOptions.length === 0 ? (
              <p className="empty-state">No verified target is currently eligible to transfer.</p>
            ) : (
              <ActionForm
                action="transfer"
                buttonLabel="Transfer complaint"
                complaintId={complaintId}
                idempotencyKey={operationKeys.transfer}
                pendingLabel="Transferring…"
                workflowVersion={workflowVersion}
              >
                <div className="field-group">
                  <label htmlFor="transfer-target">Verified transfer target</label>
                  <select id="transfer-target" name="officerAssignmentId" required>
                    <option value="">Choose a target</option>
                    {transferOptions.map((option) => (
                      <option key={option.officerAssignmentId} value={option.officerAssignmentId}>
                        <AssignmentOptionLabel option={option} />
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="transfer-reason">Transfer reason</label>
                  <select id="transfer-reason" name="reason" required>
                    {governmentComplaintTransferReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {getTransferReasonLabel(reason)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="transfer-note">Private transfer note (optional)</label>
                  <textarea id="transfer-note" maxLength={1000} name="note" rows={3} />
                </div>
              </ActionForm>
            )
          ) : null}
        </details>
      ) : null}

      {has('update_status') ? (
        <details>
          <summary>Update status</summary>
          {allowedStatusTransitions.length === 0 ? (
            <p className="empty-state">No valid status transition is currently available.</p>
          ) : (
            <ActionForm
              action="update_status"
              buttonLabel="Update status"
              complaintId={complaintId}
              idempotencyKey={operationKeys.update_status}
              pendingLabel="Updating…"
              workflowVersion={workflowVersion}
            >
              <div className="field-group">
                <label htmlFor="next-status">Next permitted status</label>
                <select id="next-status" name="status" required>
                  <option value="">Choose a status</option>
                  {allowedStatusTransitions.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="status-message">Public update (optional)</label>
                <textarea id="status-message" maxLength={1000} name="publicMessage" rows={3} />
              </div>
            </ActionForm>
          )}
        </details>
      ) : null}

      {has('add_internal_note') ? (
        <details>
          <summary>Add internal note</summary>
          <p className="private-note">Private: citizens cannot see internal notes.</p>
          <ActionForm
            action="add_internal_note"
            buttonLabel="Add private note"
            complaintId={complaintId}
            idempotencyKey={operationKeys.add_internal_note}
            pendingLabel="Saving…"
            workflowVersion={workflowVersion}
          >
            <div className="field-group">
              <label htmlFor="internal-note">Internal note</label>
              <textarea id="internal-note" maxLength={4000} name="body" required rows={5} />
            </div>
          </ActionForm>
        </details>
      ) : null}

      {has('schedule_inspection') ? (
        <details>
          <summary>Schedule inspection</summary>
          <ActionForm
            action="schedule_inspection"
            buttonLabel="Schedule inspection"
            complaintId={complaintId}
            idempotencyKey={operationKeys.schedule_inspection}
            pendingLabel="Scheduling…"
            workflowVersion={workflowVersion}
          >
            <div className="field-group">
              <label htmlFor="inspection-time">Inspection date and time (IST)</label>
              <input id="inspection-time" name="scheduledFor" required type="datetime-local" />
            </div>
            <div className="field-group">
              <label htmlFor="inspection-instructions">Private instructions (optional)</label>
              <textarea
                id="inspection-instructions"
                maxLength={2000}
                name="instructions"
                rows={3}
              />
            </div>
          </ActionForm>
        </details>
      ) : null}

      {has('complete_inspection') && scheduledInspections.length > 0 ? (
        <details>
          <summary>Complete inspection</summary>
          <ActionForm
            action="complete_inspection"
            buttonLabel="Record inspection"
            complaintId={complaintId}
            idempotencyKey={operationKeys.complete_inspection}
            pendingLabel="Recording…"
            workflowVersion={workflowVersion}
          >
            <div className="field-group">
              <label htmlFor="inspection-id">Scheduled inspection</label>
              <select id="inspection-id" name="inspectionId" required>
                {scheduledInspections.map((inspection) => (
                  <option key={inspection.id} value={inspection.id}>
                    {inspection.scheduledFor}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="inspection-outcome">Outcome</label>
              <select id="inspection-outcome" name="outcome" required>
                {governmentInspectionOutcomes.map((outcome) => (
                  <option key={outcome} value={outcome}>
                    {getInspectionOutcomeLabel(outcome)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="inspection-summary">Inspection summary</label>
              <textarea id="inspection-summary" maxLength={4000} name="summary" required rows={4} />
            </div>
          </ActionForm>
        </details>
      ) : null}

      {has('add_work_reference') ? (
        <details>
          <summary>Add work reference</summary>
          <ActionForm
            action="add_work_reference"
            buttonLabel="Add work reference"
            complaintId={complaintId}
            idempotencyKey={operationKeys.add_work_reference}
            pendingLabel="Saving…"
            workflowVersion={workflowVersion}
          >
            <div className="two-column-fields">
              <div className="field-group">
                <label htmlFor="reference-type">Reference type</label>
                <input id="reference-type" maxLength={80} name="referenceType" required />
              </div>
              <div className="field-group">
                <label htmlFor="reference-number">Reference number</label>
                <input id="reference-number" maxLength={160} name="referenceNumber" required />
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="reference-description">Description (optional)</label>
              <textarea id="reference-description" maxLength={2000} name="description" rows={3} />
            </div>
          </ActionForm>
        </details>
      ) : null}

      {has('add_external_dependency') ? (
        <details>
          <summary>Add external dependency</summary>
          <ActionForm
            action="add_external_dependency"
            buttonLabel="Record dependency"
            complaintId={complaintId}
            idempotencyKey={operationKeys.add_external_dependency}
            pendingLabel="Saving…"
            workflowVersion={workflowVersion}
          >
            <div className="field-group">
              <label htmlFor="dependency-type">Dependency type</label>
              <select id="dependency-type" name="dependencyType" required>
                {governmentExternalDependencyTypes.map((type) => (
                  <option key={type} value={type}>
                    {getDependencyTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="dependency-description">Description</label>
              <textarea
                id="dependency-description"
                maxLength={4000}
                name="description"
                required
                rows={4}
              />
            </div>
            <div className="field-group">
              <label htmlFor="dependency-date">Expected by (optional, IST)</label>
              <input id="dependency-date" name="expectedBy" type="date" />
            </div>
          </ActionForm>
        </details>
      ) : null}

      {has('resolve_external_dependency') ? (
        <details>
          <summary>Resolve external dependency</summary>
          {activeDependencies.length === 0 ? (
            <p className="empty-state">No active external dependency is available to resolve.</p>
          ) : (
            <ActionForm
              action="resolve_external_dependency"
              buttonLabel="Mark dependency resolved"
              complaintId={complaintId}
              idempotencyKey={operationKeys.resolve_external_dependency}
              pendingLabel="Resolving…"
              workflowVersion={workflowVersion}
            >
              <div className="field-group">
                <label htmlFor="resolve-dependency-id">Active dependency</label>
                <select id="resolve-dependency-id" name="dependencyId" required>
                  <option value="">Choose a dependency</option>
                  {activeDependencies.map((dependency) => (
                    <option key={dependency.id} value={dependency.id}>
                      {getDependencyTypeLabel(dependency.dependencyType)} — {dependency.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="dependency-resolution-summary">Resolution summary (optional)</label>
                <textarea
                  id="dependency-resolution-summary"
                  maxLength={2000}
                  name="resolutionSummary"
                  rows={3}
                />
              </div>
            </ActionForm>
          )}
        </details>
      ) : null}

      {has('upload_resolution_evidence') ? (
        <details>
          <summary>Upload resolution evidence</summary>
          <EvidenceUploader complaintId={complaintId} workflowVersion={workflowVersion} />
        </details>
      ) : null}

      {has('submit_resolution') ? (
        <details>
          <summary>Submit resolution</summary>
          {finalizedEvidence.length === 0 ? (
            <p className="empty-state">
              Upload and finalize resolution evidence before submitting.
            </p>
          ) : (
            <ActionForm
              action="submit_resolution"
              buttonLabel="Submit resolution"
              complaintId={complaintId}
              idempotencyKey={operationKeys.submit_resolution}
              pendingLabel="Submitting…"
              workflowVersion={workflowVersion}
            >
              <fieldset>
                <legend>Resolution evidence</legend>
                {finalizedEvidence.map((item) => (
                  <label className="checkbox-option" key={item.id}>
                    <input name="resolutionEvidenceIds" type="checkbox" value={item.id} />
                    {item.kind} evidence added {item.createdAt}
                  </label>
                ))}
              </fieldset>
              <div className="field-group">
                <label htmlFor="completion-note">Completion note</label>
                <textarea
                  id="completion-note"
                  maxLength={4000}
                  name="completionNote"
                  required
                  rows={5}
                />
              </div>
              <CompletionLocationFields />
              <div className="field-group">
                <label htmlFor="resolution-work-reference">Work reference (optional)</label>
                <select id="resolution-work-reference" name="workReferenceId">
                  <option value="">No linked work reference</option>
                  {workReferences.map((reference) => (
                    <option key={reference.id} value={reference.id}>
                      {reference.referenceType}: {reference.referenceNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="resolution-message">Public resolution message (optional)</label>
                <textarea id="resolution-message" maxLength={1000} name="publicMessage" rows={3} />
              </div>
            </ActionForm>
          )}
        </details>
      ) : null}
    </div>
  );
};
