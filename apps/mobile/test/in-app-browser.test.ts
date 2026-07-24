import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getUserFacingInAppBrowserError,
  InAppBrowserError,
  normalizeSecureExternalUrl,
  openSecureExternalPage,
} from '../src/device/in-app-browser';

describe('mobile in-app browser', () => {
  it('opens secure external pages through the injected in-app browser', async () => {
    const openedUrls: string[] = [];

    await openSecureExternalPage(
      'https://government.example/ward-directory?ward=K%2FW#office',
      async (url) => {
        openedUrls.push(url);
        return { type: 'opened' };
      },
    );

    assert.deepEqual(openedUrls, ['https://government.example/ward-directory?ward=K%2FW#office']);
  });

  it('rejects non-HTTPS, credential-bearing, and malformed URLs before opening', async () => {
    const rejectedUrls = [
      'http://government.example/ward-directory',
      'https://user:secret@government.example/ward-directory',
      'not a URL',
    ];

    for (const value of rejectedUrls) {
      let launchCount = 0;

      await assert.rejects(
        () =>
          openSecureExternalPage(value, async () => {
            launchCount += 1;
          }),
        (error: unknown) => {
          assert.ok(error instanceof InAppBrowserError);
          assert.equal(error.code, 'invalid_url');
          assert.equal(error.message, 'This link is not a secure HTTPS address.');
          assert.equal(error.message.includes(value), false);
          return true;
        },
      );

      assert.equal(launchCount, 0);
    }
  });

  it('returns a stable URL-free message when the browser cannot open', async () => {
    const sensitiveUrl = 'https://storage.example.test/evidence?token=private-token';

    await assert.rejects(
      () =>
        openSecureExternalPage(sensitiveUrl, async () => {
          throw new Error(`Could not open ${sensitiveUrl}`);
        }),
      (error: unknown) => {
        assert.ok(error instanceof InAppBrowserError);
        assert.equal(error.code, 'open_failed');
        assert.equal(error.message, 'This secure link could not be opened. Please try again.');
        assert.equal(error.message.includes('private-token'), false);
        return true;
      },
    );
  });

  it('normalizes valid HTTPS URLs and maps unknown errors to a stable message', () => {
    assert.equal(
      normalizeSecureExternalUrl('https://government.example'),
      'https://government.example/',
    );
    assert.equal(
      getUserFacingInAppBrowserError(new Error('private implementation detail')),
      'This secure link could not be opened. Please try again.',
    );
  });
});
