export const governanceSyncRunStates = [
  'queued',
  'retrieving',
  'snapshot_preserved',
  'normalizing',
  'matching',
  'detecting_changes',
  'awaiting_review',
  'approved',
  'publishing',
  'published',
  'rejected',
  'failed',
] as const;

export type GovernanceSyncRunState = (typeof governanceSyncRunStates)[number];

const allowedTransitions: Readonly<
  Record<GovernanceSyncRunState, readonly GovernanceSyncRunState[]>
> = {
  queued: ['retrieving', 'failed'],
  retrieving: ['snapshot_preserved', 'failed'],
  snapshot_preserved: ['normalizing', 'failed'],
  normalizing: ['matching', 'failed'],
  matching: ['detecting_changes', 'failed'],
  detecting_changes: ['awaiting_review', 'failed'],
  awaiting_review: ['approved', 'rejected'],
  approved: ['publishing', 'failed'],
  publishing: ['published', 'failed'],
  published: [],
  rejected: [],
  failed: [],
};

export const terminalGovernanceSyncRunStates = ['published', 'rejected', 'failed'] as const;

export const isTerminalGovernanceSyncRunState = (state: GovernanceSyncRunState): boolean =>
  terminalGovernanceSyncRunStates.some((terminalState) => terminalState === state);

export const allowedGovernanceSyncRunTransitions = (
  state: GovernanceSyncRunState,
): readonly GovernanceSyncRunState[] => allowedTransitions[state];

export const canTransitionGovernanceSyncRun = (
  current: GovernanceSyncRunState,
  next: GovernanceSyncRunState,
): boolean => allowedTransitions[current].includes(next);

export class GovernanceSyncLifecycleError extends Error {
  readonly current: GovernanceSyncRunState;
  readonly next: GovernanceSyncRunState;

  constructor(current: GovernanceSyncRunState, next: GovernanceSyncRunState) {
    super(`Governance sync run cannot transition from ${current} to ${next}.`);
    this.name = 'GovernanceSyncLifecycleError';
    this.current = current;
    this.next = next;
  }
}

export const transitionGovernanceSyncRun = (
  current: GovernanceSyncRunState,
  next: GovernanceSyncRunState,
): GovernanceSyncRunState => {
  if (!canTransitionGovernanceSyncRun(current, next)) {
    throw new GovernanceSyncLifecycleError(current, next);
  }
  return next;
};
