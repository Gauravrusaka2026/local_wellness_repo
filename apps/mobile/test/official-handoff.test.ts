import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ComplaintHandoffAction } from '@local-wellness/types';

import {
  getOfficialHandoffTarget,
  openOfficialHandoffAction,
} from '../src/complaints/official-handoff';

const action = (overrides: Partial<ComplaintHandoffAction> = {}): ComplaintHandoffAction => ({
  description: 'Use the official support channel.',
  key: 'call_112',
  kind: 'call',
  label: 'Call 112',
  priority: 10,
  target: '112',
  ...overrides,
});

describe('protected complaint official handoffs', () => {
  it('builds only digits-only telephone and secure HTTPS targets', () => {
    assert.deepEqual(getOfficialHandoffTarget(action()), { kind: 'call', url: 'tel:112' });
    assert.deepEqual(
      getOfficialHandoffTarget(
        action({
          key: 'open_portal',
          kind: 'browser',
          label: 'Open official portal',
          target: 'https://example.gov.in/help',
        }),
      ),
      { kind: 'browser', url: 'https://example.gov.in/help' },
    );
    assert.throws(() => getOfficialHandoffTarget(action({ target: '+91112' })));
    assert.throws(() =>
      getOfficialHandoffTarget(
        action({
          key: 'unsafe_portal',
          kind: 'browser',
          target: 'http://example.gov.in/help',
        }),
      ),
    );
  });

  it('dispatches calls and browser links through separate injected launchers', async () => {
    const calls: string[] = [];
    const browsers: string[] = [];
    const launchers = {
      openBrowser: async (url: string) => {
        browsers.push(url);
      },
      openCall: async (url: string) => {
        calls.push(url);
      },
    };

    await openOfficialHandoffAction(action(), launchers);
    await openOfficialHandoffAction(
      action({
        key: 'open_portal',
        kind: 'browser',
        label: 'Open official portal',
        target: 'https://example.gov.in/help',
      }),
      launchers,
    );

    assert.deepEqual(calls, ['tel:112']);
    assert.deepEqual(browsers, ['https://example.gov.in/help']);
  });
});
