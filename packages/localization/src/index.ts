export type Locale = 'en' | 'hi' | 'mr';
const englishMessages = {
  appName: 'JagrukSetu',
  reportIssue: 'Report a civic issue',
  searchPlaceholder: 'Search by issue, place, ward, or office',
  nearbyIssues: 'Nearby issues',
  officialUpdates: 'Recent official updates',
  trustTitle: 'Built for accountable civic action',
  trustBody: 'Your report stays private. Routing is resolved from current governance data.',
  locationQuestion: 'Where is the issue?',
  categoryQuestion: 'What best describes the problem?',
  evidenceHint: 'A photo helps the right team act faster.',
  descriptionHint: 'Add a few words so the team knows what to look for.',
  privateReport: 'Private account report',
  privateReportHint: 'Your identity and evidence are shared only with the authorised workflow.',
  routePending: 'Routing is pending verification',
  reportFiled: 'Report filed',
  noNearbyIssues: 'No nearby issues yet.',
  tryAgain: 'Try again',
  saveAndContinue: 'Save and continue',
  reviewReport: 'Check your report before sending',
  statusSubmitted: 'Submitted',
  statusAssigned: 'Assigned',
  statusAcknowledged: 'Acknowledged',
  statusInProgress: 'In progress',
  statusResolved: 'Resolved',
  statusReopened: 'Reopened',
  statusClosed: 'Closed',
  language: 'Language',
} as const;

export type MessageKey = keyof typeof englishMessages;
type MessageCatalog = Record<Locale, Partial<Record<MessageKey, string>>> & {
  en: typeof englishMessages;
};

const messages: MessageCatalog = {
  en: englishMessages,
  hi: {},
  mr: {},
};

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key];
}

export function localeForIntl(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : `${locale}-IN`;
}

export function getMessages(locale: Locale): Readonly<Record<MessageKey, string>> {
  return new Proxy(messages.en, {
    get: (_target, key: string) => translate(locale, key as MessageKey),
  });
}

export { messages };
