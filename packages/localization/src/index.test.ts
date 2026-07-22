import assert from 'node:assert/strict';
import test from 'node:test';

import { getMessages, localeForIntl, translate } from './index.js';

test('localisation falls back safely while preserving supported language codes', () => {
  assert.equal(localeForIntl('en'), 'en-GB');
  assert.equal(localeForIntl('mr'), 'mr-IN');
  assert.equal(translate('hi', 'reportIssue'), 'Report a civic issue');
  assert.equal(getMessages('mr').statusResolved, 'Resolved');
});
