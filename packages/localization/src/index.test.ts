import assert from 'node:assert/strict';
import test from 'node:test';

import { getMessages, localeForIntl, messages, translate } from './index.js';

test('localisation provides supported civic labels and locale codes', () => {
  assert.equal(localeForIntl('en'), 'en-GB');
  assert.equal(localeForIntl('mr'), 'mr-IN');
  assert.equal(translate('hi', 'reportIssue'), 'नागरिक समस्या दर्ज करें');
  assert.equal(getMessages('mr').reportSubmitted, 'नोंद जमा झाली');
  assert.equal(
    translate('hi', 'signedInAs', { identifier: 'citizen@example.test' }),
    'citizen@example.test के रूप में साइन इन',
  );
});

test('each supported locale implements the complete message catalogue', () => {
  const englishKeys = Object.keys(messages.en).sort();
  assert.deepEqual(Object.keys(messages.hi).sort(), englishKeys);
  assert.deepEqual(Object.keys(messages.mr).sort(), englishKeys);
  assert.equal(getMessages('mr').statusResolved, 'निराकरण झाले');
  assert.equal(getMessages('hi').restoringSession, 'आपका सत्र वापस लाया जा रहा है…');
});

test('translated templates preserve the English placeholder contract', () => {
  const placeholderNames = (template: string): string[] =>
    [...template.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1] ?? '').sort();

  for (const [key, englishTemplate] of Object.entries(messages.en)) {
    assert.deepEqual(
      placeholderNames(messages.hi[key as keyof typeof messages.en]),
      placeholderNames(englishTemplate),
      `Hindi placeholders differ for ${key}`,
    );
    assert.deepEqual(
      placeholderNames(messages.mr[key as keyof typeof messages.en]),
      placeholderNames(englishTemplate),
      `Marathi placeholders differ for ${key}`,
    );
  }

  assert.equal(
    translate('mr', 'updatedOn', { date: '24 जुलै 2026' }),
    '24 जुलै 2026 रोजी अपडेट केले',
  );
});
