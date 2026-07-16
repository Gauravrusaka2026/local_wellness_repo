import type {
  ComplaintEscalationEvent,
  ComplaintResolutionFeedback,
  ComplaintResolutionRatings,
  ComplaintReopenRequest,
} from '@local-wellness/types';

export interface ResolutionAccountabilityRefreshCursor {
  complaintId: string;
  signal: number;
}

export interface CitizenAccountabilityHistoryItem {
  details: string[];
  id: string;
  occurredAt: string;
  title: string;
  type: 'escalation' | 'feedback' | 'reopen';
}

interface CitizenAccountabilityHistorySource {
  escalations: ComplaintEscalationEvent[];
  feedback: ComplaintResolutionFeedback[];
  reopenRequests: ComplaintReopenRequest[];
}

const readableCode = (value: string): string => value.replaceAll('_', ' ');

const ratingDetails = (ratings: ComplaintResolutionRatings | null): string | null =>
  ratings === null
    ? null
    : [
        `satisfaction ${ratings.satisfaction}`,
        `speed ${ratings.speed}`,
        `quality ${ratings.quality}`,
        `communication ${ratings.communication}`,
      ].join(' · ');

export const shouldRefreshResolutionAccountability = (
  previous: ResolutionAccountabilityRefreshCursor,
  next: ResolutionAccountabilityRefreshCursor,
): boolean => previous.complaintId === next.complaintId && previous.signal !== next.signal;

export const buildCitizenAccountabilityHistory = (
  source: CitizenAccountabilityHistorySource,
): CitizenAccountabilityHistoryItem[] => {
  const feedback = source.feedback.map((entry): CitizenAccountabilityHistoryItem => {
    const ratings = ratingDetails(entry.ratings);
    return {
      details: [
        `Outcome: ${readableCode(entry.outcome)}`,
        ...(ratings === null ? [] : [`Ratings: ${ratings}`]),
        ...(entry.comment === null ? [] : [`Comment: ${entry.comment}`]),
      ],
      id: `feedback:${entry.id}`,
      occurredAt: entry.submittedAt,
      title: 'Feedback receipt',
      type: 'feedback',
    };
  });
  const reopenRequests = source.reopenRequests.map((entry): CitizenAccountabilityHistoryItem => ({
    details: [
      `Result: ${readableCode(entry.resultingStatus)}`,
      `Reason: ${readableCode(entry.reasonCode)}`,
      `Explanation: ${entry.explanation}`,
      `${entry.evidenceIds.length} evidence item(s) attached`,
    ],
    id: `reopen:${entry.id}`,
    occurredAt: entry.requestedAt,
    title: `Reopen request ${entry.attemptNumber}`,
    type: 'reopen',
  }));
  const escalations = source.escalations.map((entry): CitizenAccountabilityHistoryItem => ({
    details: [`Level: ${entry.level}`, `Reason: ${readableCode(entry.reasonCode)}`],
    id: `escalation:${entry.id}`,
    occurredAt: entry.occurredAt,
    title: 'Escalation receipt',
    type: 'escalation',
  }));

  return [...feedback, ...reopenRequests, ...escalations].sort((left, right) => {
    const byTime = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    return byTime === 0 ? left.id.localeCompare(right.id) : byTime;
  });
};
