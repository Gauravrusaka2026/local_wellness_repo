import type { MessageKey, MessageValues } from '@local-wellness/localization';
import { translate } from '@local-wellness/localization';
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

type HistoryTranslate = (key: MessageKey, values?: MessageValues) => string;

const ratingDetails = (
  ratings: ComplaintResolutionRatings | null,
  t: HistoryTranslate,
): string | null =>
  ratings === null
    ? null
    : t('historyRatingDetails', {
        communication: ratings.communication,
        quality: ratings.quality,
        satisfaction: ratings.satisfaction,
        speed: ratings.speed,
      });

export const shouldRefreshResolutionAccountability = (
  previous: ResolutionAccountabilityRefreshCursor,
  next: ResolutionAccountabilityRefreshCursor,
): boolean => previous.complaintId === next.complaintId && previous.signal !== next.signal;

export const buildCitizenAccountabilityHistory = (
  source: CitizenAccountabilityHistorySource,
  t: HistoryTranslate = (key, values) => translate('en', key, values),
): CitizenAccountabilityHistoryItem[] => {
  const feedback = source.feedback.map((entry): CitizenAccountabilityHistoryItem => {
    const ratings = ratingDetails(entry.ratings, t);
    return {
      details: [
        t('historyOutcome', { outcome: readableCode(entry.outcome) }),
        ...(ratings === null ? [] : [t('historyRatings', { ratings })]),
        ...(entry.comment === null ? [] : [t('historyComment', { comment: entry.comment })]),
      ],
      id: `feedback:${entry.id}`,
      occurredAt: entry.submittedAt,
      title: t('feedbackReceipt'),
      type: 'feedback',
    };
  });
  const reopenRequests = source.reopenRequests.map((entry): CitizenAccountabilityHistoryItem => ({
    details: [
      t('historyResult', { result: readableCode(entry.resultingStatus) }),
      t('historyReason', { reason: readableCode(entry.reasonCode) }),
      t('historyExplanation', { explanation: entry.explanation }),
      t('historyEvidenceAttached', { count: entry.evidenceIds.length }),
    ],
    id: `reopen:${entry.id}`,
    occurredAt: entry.requestedAt,
    title: t('reopenRequestNumber', { number: entry.attemptNumber }),
    type: 'reopen',
  }));
  const escalations = source.escalations.map((entry): CitizenAccountabilityHistoryItem => ({
    details: [
      t('historyLevel', { level: entry.level }),
      t('historyReason', { reason: readableCode(entry.reasonCode) }),
    ],
    id: `escalation:${entry.id}`,
    occurredAt: entry.occurredAt,
    title: t('escalationReceipt'),
    type: 'escalation',
  }));

  return [...feedback, ...reopenRequests, ...escalations].sort((left, right) => {
    const byTime = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    return byTime === 0 ? left.id.localeCompare(right.id) : byTime;
  });
};
